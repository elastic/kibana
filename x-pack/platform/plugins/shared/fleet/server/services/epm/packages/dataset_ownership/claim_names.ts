/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRegistryDataStreamAssetBaseName } from '../../../../../common/services';
import type { PackageInfo, RegistryDataStream } from '../../../../../common/types';
import {
  generateNamespaceTemplateIndexPattern,
  generateNamespaceTemplateName,
  generateTemplateIndexPattern,
  getNamespaceTemplatePriority,
  getTemplatePriority,
} from '../../elasticsearch/template/template';
import { isOtelDataStream } from '../namespace_template_utils';

export interface DatasetClaimNames {
  baseName: string;
  indexPattern: string;
  isPrefix: boolean;
  priority: number;
}

export interface ProspectiveTemplate {
  /** Claim id, the generated base name. */
  baseName: string;
  /** Index template name that will be written, which differs from baseName for namespace templates. */
  templateName: string;
  indexPattern: string;
  priority: number;
  isPrefix: boolean;
}

/** `logs-x@namespace.prod` and `logs-x` both belong to the claim `logs-x`. */
export const claimBaseNameOf = (templateName: string): string => templateName.split('@')[0];

/**
 * Derives the generated Elasticsearch names a data stream claims. Callers compare these rather than
 * raw `dataset` strings so lowercasing, hidden dot prefixes, OTel suffixes and dataset_is_prefix
 * patterns are all accounted for.
 */
export const getDatasetClaimNames = (
  dataStream: RegistryDataStream,
  isOtelInputType?: boolean
): DatasetClaimNames => ({
  baseName: getRegistryDataStreamAssetBaseName(dataStream, isOtelInputType),
  indexPattern: generateTemplateIndexPattern(dataStream, isOtelInputType),
  isPrefix: !!dataStream.dataset_is_prefix,
  priority: getTemplatePriority(dataStream),
});

export const getPackageClaimNames = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> & { data_streams?: RegistryDataStream[] }
): DatasetClaimNames[] =>
  (packageInfo.data_streams ?? []).map((dataStream) =>
    getDatasetClaimNames(dataStream, isOtelDataStream(dataStream, packageInfo))
  );

export const getPackageProspectiveTemplates = (
  packageInfo: Pick<PackageInfo, 'policy_templates'> & { data_streams?: RegistryDataStream[] }
): ProspectiveTemplate[] =>
  getPackageClaimNames(packageInfo).map((names) => ({ ...names, templateName: names.baseName }));

/** Claim names for templates already recorded on the package SO, including input-package and custom datasets. */
export const getClaimNamesFromInstalledEs = (
  installedEs: Array<{ id: string; type: string }>
): DatasetClaimNames[] => {
  const seen = new Set<string>();
  const names: DatasetClaimNames[] = [];
  for (const { id, type } of installedEs) {
    if (type !== 'index_template' || id.includes('@')) continue;
    const baseName = claimBaseNameOf(id);
    if (seen.has(baseName)) continue;
    seen.add(baseName);
    names.push({
      baseName,
      indexPattern: `${baseName}-*`,
      isPrefix: false,
      priority: 200,
    });
  }
  return names;
};

export const mergeClaimNames = (
  primary: DatasetClaimNames[],
  extra: DatasetClaimNames[]
): DatasetClaimNames[] => {
  const byBase = new Map(primary.map((name) => [name.baseName, name]));
  for (const name of extra) {
    if (!byBase.has(name.baseName)) byBase.set(name.baseName, name);
  }
  return [...byBase.values()];
};

/**
 * Descriptors for the namespace-scoped templates a namespace workflow is about to create. Their
 * pattern is exact rather than wildcarded and their priority carries the namespace boost, so a
 * foreign template that is harmless against the base template can still be taken over by these.
 *
 * `dataStreams` is separate from `packageInfo` because the namespace workflows only hold
 * `Pick<PackageInfo, 'policy_templates'>` alongside their own data stream list.
 */
export const getNamespaceProspectiveTemplates = (
  dataStreams: RegistryDataStream[],
  packageInfo: Pick<PackageInfo, 'policy_templates'>,
  namespaces: string[]
): ProspectiveTemplate[] =>
  dataStreams.flatMap((dataStream) => {
    const isOtelInputType = isOtelDataStream(dataStream, packageInfo);
    const names = getDatasetClaimNames(dataStream, isOtelInputType);
    return namespaces.map((namespace) => ({
      ...names,
      templateName: generateNamespaceTemplateName(names.baseName, namespace),
      indexPattern: generateNamespaceTemplateIndexPattern(dataStream, namespace, isOtelInputType),
      priority: getNamespaceTemplatePriority(dataStream),
    }));
  });

/**
 * Descriptors for templates that already exist and are about to be patched. Reads the real pattern
 * and priority off the fetched template rather than re-deriving them, so a patch is checked against
 * what Elasticsearch will actually resolve.
 */
export const getProspectiveTemplatesFromExisting = (
  templates: Array<{
    templateName: string;
    indexTemplate: { index_patterns?: string | string[]; priority?: number };
  }>
): ProspectiveTemplate[] =>
  templates.flatMap(({ templateName, indexTemplate }) =>
    ([] as string[]).concat(indexTemplate.index_patterns ?? []).map((indexPattern) => ({
      baseName: claimBaseNameOf(templateName),
      templateName,
      indexPattern,
      priority: indexTemplate.priority ?? 0,
      isPrefix: indexPattern.includes('.*-'),
    }))
  );

/**
 * True when an index pattern constrains the dataset segment rather than matching every dataset of
 * its type. Fleet packages are expected to outrank generic templates such as the built-in
 * `logs-*-*`, so only a dataset-specific foreign template can be taken over.
 *
 * Fail closed: only a fully unconstrained `*` or a type-wide wildcard (second dash-delimited
 * segment is `*`, as in `logs-*-*` or `.logs-*`) is generic. A pattern with no dataset slot, such
 * as `*payroll.records*`, is treated as specific.
 */
export const isDatasetSpecificPattern = (pattern: string): boolean => {
  if (pattern === '*') return false;
  const body = pattern.startsWith('.') ? pattern.slice(1) : pattern;
  const segments = body.split('-');
  if (segments.length < 2) return true;
  return segments[1] !== '*';
};
