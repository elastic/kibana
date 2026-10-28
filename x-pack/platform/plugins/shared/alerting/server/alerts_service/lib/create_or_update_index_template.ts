/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesIndexSettings,
  IndicesPutIndexTemplateRequest,
  MappingTypeMapping,
  Metadata,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import type { IIndexPatternString } from '../resource_installer_utils';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';
import type { DataStreamAdapter } from './data_stream_adapter';
import {
  evaluateTotalFieldsLimit,
  getTotalFieldsLimitFromSettings,
  getTotalFieldsLimitSettings,
  TOTAL_FIELDS_LIMIT_SETTING,
} from './total_fields_limit_settings';
import { computeResourceHash, RESOURCE_CONTENT_HASH_META_FIELD } from './resource_hash';

interface GetIndexTemplateOpts {
  componentTemplateRefs: string[];
  ilmPolicyName: string;
  indexPatterns: IIndexPatternString;
  kibanaVersion: string;
  namespace: string;
  totalFieldsLimit: number;
  dataStreamAdapter: DataStreamAdapter;
}

export const getIndexTemplate = ({
  componentTemplateRefs,
  ilmPolicyName,
  indexPatterns,
  kibanaVersion,
  namespace,
  totalFieldsLimit,
  dataStreamAdapter,
}: GetIndexTemplateOpts): IndicesPutIndexTemplateRequest => {
  const indexMetadata: Metadata = {
    kibana: {
      version: kibanaVersion,
    },
    managed: true,
    namespace,
  };

  const patterns: string[] = [indexPatterns.pattern];
  if (indexPatterns.reindexedPattern) {
    patterns.push(indexPatterns.reindexedPattern);
  }

  const dataStreamFields = dataStreamAdapter.getIndexTemplateFields(indexPatterns.alias, patterns);

  const indexLifecycle = {
    name: ilmPolicyName,
    rollover_alias: dataStreamFields.rollover_alias,
  };

  return {
    name: indexPatterns.template,
    ...(dataStreamFields.data_stream ? { data_stream: dataStreamFields.data_stream } : {}),
    index_patterns: dataStreamFields.index_patterns,
    composed_of: componentTemplateRefs,
    template: {
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
        ...(dataStreamAdapter.isUsingDataStreams()
          ? {}
          : {
              'index.lifecycle': indexLifecycle,
            }),
        'index.mapping.ignore_malformed': true,
        ...getTotalFieldsLimitSettings(totalFieldsLimit),
      },
      mappings: {
        dynamic: false,
        _meta: indexMetadata,
      },
      ...(indexPatterns.secondaryAlias
        ? {
            aliases: {
              [indexPatterns.secondaryAlias]: {
                is_write_index: false,
              },
            },
          }
        : {}),
    },
    _meta: indexMetadata,

    // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
    // then newly created indices will use the matching template with the *longest* namespace
    priority: namespace.length,
  };
};

interface CreateOrUpdateIndexTemplateOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
}

/**
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
interface ExistingIndexTemplateInfo {
  settings?: IndicesIndexSettings;
  contentHash?: string;
}

const getExistingIndexTemplateInfo = async (
  esClient: ElasticsearchClient,
  name: string,
  logger: Logger
): Promise<ExistingIndexTemplateInfo | undefined> => {
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getIndexTemplate({ name }),
      { logger }
    );
    const existingTemplate = (response?.index_templates ?? []).find(
      (indexTemplate) => indexTemplate.name === name
    );
    if (!existingTemplate) {
      return undefined;
    }
    return {
      settings: existingTemplate.index_template?.template?.settings,
      contentHash: existingTemplate.index_template?._meta?.[RESOURCE_CONTENT_HASH_META_FIELD],
    };
  } catch (err) {
    // Any failure reading the installed template (404, permissions, exhausted
    // retries) leaves the installed content unknown, which falls through to the
    // PUT. The check must never block an install that would otherwise succeed.
    logger.debug(`Could not read installed index template ${name}; will install (${err.message})`);
    return undefined;
  }
};

/**
 * Returns the part of the template body the content hash is computed over.
 *
 * The total_fields.limit is deliberately left out: Kibana itself raises it outside this
 * path while a mapping install crawls the limit up (`updateIndexTemplateFieldsLimit`),
 * and operators raise it by hand through DevTools or the fields-limit API, both leaving
 * `_meta` untouched. Hashing it would make every such change read as a changed template
 * and trigger an install that rewrites byte-identical content. It is compared as a number
 * instead, so a genuinely raised configured limit still installs.
 */
const getHashableTemplate = ({
  _meta,
  template: innerTemplate,
  ...rest
}: IndicesPutIndexTemplateRequest): Record<string, unknown> => {
  if (!innerTemplate?.settings) {
    return { ...rest, ...(innerTemplate ? { template: innerTemplate } : {}) };
  }
  // The limit is a literal dotted key rather than a nested path, so it cannot be
  // removed with a lodash path.
  const { [TOTAL_FIELDS_LIMIT_SETTING]: _limit, ...settingsWithoutLimit } = innerTemplate.settings;
  return {
    ...rest,
    template: { ...innerTemplate, settings: settingsWithoutLimit },
  };
};

/**
 * Explains why an install is going ahead, so a resurgence of template writes can be
 * told apart from a first install without turning on debug logging.
 */
const getInstallReason = ({
  existing,
  contentHash,
  templateLimit,
  existingLimit,
}: {
  existing: ExistingIndexTemplateInfo | undefined;
  contentHash: string;
  templateLimit: number | undefined;
  existingLimit: number | undefined;
}): string => {
  if (existing === undefined) {
    return 'not installed';
  }
  if (existing.contentHash === undefined) {
    return 'installed template carries no content hash';
  }
  if (existing.contentHash !== contentHash) {
    return `content changed (${existing.contentHash} -> ${contentHash})`;
  }
  return `installed total_fields.limit of ${
    existingLimit ?? 'none'
  } does not satisfy the configured ${templateLimit}`;
};

export const createOrUpdateIndexTemplate = async ({
  logger,
  esClient,
  template,
}: CreateOrUpdateIndexTemplateOpts) => {
  logger.debug(`Installing index template ${template.name}`);

  let templateToInstall = template;
  const existing = await getExistingIndexTemplateInfo(esClient, template.name, logger);
  const existingLimit = getTotalFieldsLimitFromSettings(existing?.settings);

  // Never lower a total_fields.limit that is already higher than the configured value;
  // a higher limit may have been set manually or by a previous, higher configuration.
  const templateLimit = getTotalFieldsLimitFromSettings(template.template?.settings);
  if (existingLimit !== undefined && templateLimit !== undefined && existingLimit > templateLimit) {
    logger.debug(
      `Preserving existing total_fields.limit of ${existingLimit} for index template ${template.name} instead of lowering it to ${templateLimit}`
    );
    templateToInstall = {
      ...template,
      template: {
        ...template.template,
        settings: {
          ...template.template?.settings,
          [TOTAL_FIELDS_LIMIT_SETTING]: existingLimit,
        },
      },
    };
  }

  // Stamp the content hash (over the template body, excluding the top-level `_meta` that
  // carries it and the total_fields.limit that is tracked as a number instead) so a
  // later install can detect an unchanged template and skip the cluster-state write.
  const contentHash = computeResourceHash(getHashableTemplate(templateToInstall));
  templateToInstall = {
    ...templateToInstall,
    _meta: {
      ...templateToInstall._meta,
      [RESOURCE_CONTENT_HASH_META_FIELD]: contentHash,
    },
  };

  // An install is redundant only when the content is unchanged *and* the installed
  // limit already covers the configured one. Skip on a positive match of both; a
  // missing stamp, an unreadable template or an unsatisfied limit installs.
  const isLimitSatisfied =
    templateLimit === undefined ||
    evaluateTotalFieldsLimit([existing?.settings], templateLimit).isSatisfied;
  if (existing?.contentHash === contentHash && isLimitSatisfied) {
    logger.debug(
      `Skipping install of index template ${template.name}; content unchanged (${contentHash})`
    );
    return;
  }

  let mappings: MappingTypeMapping = {};
  try {
    // Simulate the index template to proactively identify any issues with the mapping
    const simulateResponse = await retryTransientEsErrors(
      () => esClient.indices.simulateTemplate(templateToInstall),
      { logger }
    );
    mappings = simulateResponse.template.mappings;
  } catch (err) {
    logger.error(
      `Failed to simulate index template mappings for ${template.name}; not applying mappings - ${err.message}`,
      err
    );
    return;
  }

  if (isEmpty(mappings)) {
    throw new Error(
      `No mappings would be generated for ${template.name}, possibly due to failed/misconfigured bootstrapping`
    );
  }

  logger.info(
    `Installing index template ${template.name}: ${getInstallReason({
      existing,
      contentHash,
      templateLimit,
      existingLimit,
    })}`
  );

  try {
    await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(templateToInstall), {
      logger,
    });
  } catch (err) {
    logger.error(`Error installing index template ${template.name} - ${err.message}`, err);
    throw err;
  }
};
