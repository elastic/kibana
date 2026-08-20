/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';
import type { Installation } from '../../../../types';

import type { ProspectiveTemplate } from './claim_names';
import { claimBaseNameOf, isDatasetSpecificPattern } from './claim_names';
import { getDatasetClaims } from './claims';
import { patternsOverlap } from './patterns';

export type OwnershipConflictReason =
  | 'would_govern'
  | 'same_template_name'
  | 'equal_priority_overlap'
  | 'outranks_specific_template'
  | 'lower_priority_specific_overlap';

export interface OwnershipConflict {
  kind: 'data_stream' | 'index_template';
  name: string;
  reason: OwnershipConflictReason;
  governingTemplate?: string;
  governingPriority?: number;
  owningPackage?: string;
}

export interface AdoptedStream {
  baseName: string;
  name: string;
  previousDefaultPipeline?: string;
}

export interface OwnershipResolution {
  /** Data streams later steps may modify. */
  allowlist: string[];
  /** Foreign streams taken over under an adoption claim, with their pre-install pipeline. */
  adoptedStreams: AdoptedStream[];
  conflicts: OwnershipConflict[];
  warnings: OwnershipConflict[];
}

const isNotFound = (error: unknown): boolean =>
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404;

/**
 * Ids of the index templates the package has installed. Corroborates a claim; never establishes
 * ownership on its own, because a takeover writes its own `_meta` and asset references.
 */
const getInstalledTemplateIds = async (
  soClient: SavedObjectsClientContract,
  packageName: string
): Promise<Set<string>> => {
  const result = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.name:"${packageName}"`,
    perPage: 1,
  });
  const installedEs = result.saved_objects[0]?.attributes?.installed_es ?? [];
  return new Set(installedEs.filter(({ type }) => type === 'index_template').map(({ id }) => id));
};

/**
 * Decides which data streams a package may modify, and rejects anything that would take over a
 * resource it does not own. Runs before any asset is created, because once Fleet has written its
 * templates every Elasticsearch-side ownership signal is contaminated.
 */
export const resolveDatasetOwnership = async ({
  esClient,
  soClient,
  packageName,
  prospective,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  packageName: string;
  prospective: ProspectiveTemplate[];
}): Promise<OwnershipResolution> => {
  if (prospective.length === 0) {
    return { allowlist: [], adoptedStreams: [], conflicts: [], warnings: [] };
  }

  const claims = await getDatasetClaims(soClient, [
    ...new Set(prospective.map(({ baseName }) => baseName)),
  ]);

  // Claims are acquired after resolution, so nothing this attempt creates can vouch for itself. A
  // pending claim here belongs to an earlier attempt whose assets were kept, which is what lets a
  // retryFromLastState install resume over templates it already wrote.
  const held = new Set(
    [...claims.entries()]
      .filter(([, claim]) => claim.package_name === packageName)
      .map(([baseName]) => baseName)
  );
  // Only an active adoption claim authorizes takeover. install and backfill claims never do.
  const authorized = new Set(
    [...claims.entries()]
      .filter(
        ([, claim]) =>
          claim.package_name === packageName &&
          claim.origin === 'adoption' &&
          claim.status === 'active'
      )
      .map(([baseName]) => baseName)
  );

  const installedTemplateIds = await getInstalledTemplateIds(soClient, packageName);

  const allTemplates = (await esClient.indices.getIndexTemplate({})).index_templates ?? [];
  const templatesByName = new Map(allTemplates.map(({ name, index_template: t }) => [name, t]));
  const ownerOf = (templateName?: string): string | undefined =>
    (templatesByName.get(templateName ?? '')?._meta as { package?: { name?: string } } | undefined)
      ?.package?.name;

  /**
   * A template is this package's only when a claim says so. `_meta` and `installed_es` corroborate
   * the claim; on their own they are package-supplied.
   */
  const isOurs = (templateName: string): boolean => {
    if (!held.has(claimBaseNameOf(templateName)) || !installedTemplateIds.has(templateName)) {
      return false;
    }
    const owner = ownerOf(templateName);
    return owner === packageName || owner === undefined;
  };

  const allowlist = new Set<string>();
  const adopted = new Map<string, AdoptedStream>();
  const conflicts = new Map<string, OwnershipConflict>();
  const warnings = new Map<string, OwnershipConflict>();
  const add = (target: Map<string, OwnershipConflict>, conflict: OwnershipConflict): void => {
    target.set(`${conflict.kind}:${conflict.name}:${conflict.reason}`, conflict);
  };

  for (const target of prospective) {
    const { baseName, templateName, indexPattern, priority } = target;
    const adoptionAuthorized = authorized.has(baseName);

    if (!adoptionAuthorized) {
      for (const { name, index_template: template } of allTemplates) {
        if (isOurs(name)) continue;

        // Fleet overwrites a template of the same generated name whatever its priority is, so this
        // check must run before any overlap or priority reasoning.
        if (name === templateName) {
          add(conflicts, {
            kind: 'index_template',
            name,
            reason: 'same_template_name',
            owningPackage: ownerOf(name),
            governingPriority: template.priority,
          });
          continue;
        }

        const patterns = ([] as string[]).concat(template.index_patterns ?? []);
        const overlapping = patterns.filter((pattern) => patternsOverlap(indexPattern, pattern));
        if (overlapping.length === 0) continue;

        const foreignPriority = template.priority ?? 0;
        // Equal priority plus overlap is not harmless: Elasticsearch may reject the PUT outright,
        // and when it does not, which template wins is undefined.
        if (foreignPriority === priority) {
          add(conflicts, {
            kind: 'index_template',
            name,
            reason: 'equal_priority_overlap',
            owningPackage: ownerOf(name),
            governingPriority: foreignPriority,
          });
          continue;
        }

        if (foreignPriority > priority) {
          // Installing under a higher-priority specific template is a dormant takeover: this
          // template becomes governing if that owner is later removed.
          if (overlapping.some(isDatasetSpecificPattern)) {
            add(conflicts, {
              kind: 'index_template',
              name,
              reason: 'lower_priority_specific_overlap',
              owningPackage: ownerOf(name),
              governingPriority: foreignPriority,
            });
          }
          continue;
        }

        // Outranking a generic template such as the built-in `logs-*-*` is how Fleet is meant to
        // work, so that is a warning. Outranking one that singles out this dataset is a takeover of
        // a future stream, so that is a conflict.
        const specific = overlapping.some(isDatasetSpecificPattern);
        add(specific ? conflicts : warnings, {
          kind: 'index_template',
          name,
          reason: 'outranks_specific_template',
          owningPackage: ownerOf(name),
          governingPriority: foreignPriority,
        });
      }
    }

    let matching: Awaited<ReturnType<typeof esClient.indices.getDataStream>>;
    try {
      matching = await esClient.indices.getDataStream({
        name: indexPattern,
        expand_wildcards: ['open', 'hidden'],
      });
    } catch (error) {
      if (!isNotFound(error)) throw error;
      continue;
    }

    for (const stream of matching.data_streams ?? []) {
      const governingTemplate = stream.template;
      const governingPriority = templatesByName.get(governingTemplate)?.priority ?? 0;

      if (isOurs(governingTemplate)) {
        allowlist.add(stream.name);
        continue;
      }

      if (adoptionAuthorized) {
        allowlist.add(stream.name);
        if (!adopted.has(stream.name)) {
          const writeIndex = stream.indices?.at(-1)?.index_name;
          const settings = writeIndex
            ? await esClient.indices.getSettings({ index: writeIndex })
            : undefined;
          adopted.set(stream.name, {
            baseName,
            name: stream.name,
            previousDefaultPipeline: writeIndex
              ? settings?.[writeIndex]?.settings?.index?.default_pipeline
              : undefined,
          });
        }
        continue;
      }

      add(priority > governingPriority ? conflicts : warnings, {
        kind: 'data_stream',
        name: stream.name,
        reason: 'would_govern',
        governingTemplate,
        governingPriority,
        owningPackage: ownerOf(governingTemplate),
      });
    }
  }

  return {
    allowlist: [...allowlist],
    adoptedStreams: [...adopted.values()],
    conflicts: [...conflicts.values()],
    warnings: [...warnings.values()],
  };
};
