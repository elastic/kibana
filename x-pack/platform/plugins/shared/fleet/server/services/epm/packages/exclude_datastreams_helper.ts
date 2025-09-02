/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryPolicyIntegrationTemplate } from '../../../../common/types';
import type { RegistryPolicyTemplate } from '../../../../common';
import type { Installable, RegistrySearchResult } from '../../../types';

export function shouldIncludePackageWithDatastreamTypes(
  pkg: Installable<any>,
  excludeDataStreamTypes: string[] = []
) {
  const shouldInclude =
    (pkg.data_streams || [])?.length === 0 ||
    pkg.data_streams?.some((dataStream: any) => {
      return !excludeDataStreamTypes.includes(dataStream.type);
    });

  return shouldInclude;
}

export function shouldIncludePolicyTemplateWithDatastreamTypes(
  pkg: Installable<any>,
  policyTemplate: RegistryPolicyTemplate,
  excludeDataStreamTypes: string[] = []
) {
  const policyTemplateIntegrationTemplate = policyTemplate as RegistryPolicyIntegrationTemplate;
  if (
    !policyTemplateIntegrationTemplate.data_streams ||
    policyTemplateIntegrationTemplate.data_streams.length === 0
  ) {
    return true;
  }

  return policyTemplateIntegrationTemplate.data_streams?.some((dataStream: any) => {
    const pkgDataStream = pkg.data_streams?.find((ds: any) =>
      ds.dataset.includes(`.${dataStream}`)
    );
    if (!pkgDataStream) {
      return true;
    }
    return !excludeDataStreamTypes.includes(pkgDataStream.type);
  });
}

/**
 * Filter data_streams and policy templates to respect excluded DataStreamTypes
 */
export function filterOutExcludedDataStreamTypes<T extends RegistrySearchResult>(
  packageList: Array<Installable<T>>,
  excludeDataStreamTypes: string[] = []
): Array<Installable<T>> {
  if (excludeDataStreamTypes.length > 0) {
    // filter out packages where all data streams have excluded types e.g. metrics
    return packageList.reduce((acc, pkg) => {
      const shouldInclude = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
      if (shouldInclude) {
        // filter out excluded data stream types
        const filteredDataStreams =
          pkg.data_streams?.filter(
            (dataStream: any) => !excludeDataStreamTypes.includes(dataStream.type)
          ) ?? [];

        // filter out excluded policy templates
        const filteredPolicyTemplates = pkg.policy_templates?.filter((policyTemplate: any) => {
          return shouldIncludePolicyTemplateWithDatastreamTypes(
            pkg,
            policyTemplate,
            excludeDataStreamTypes
          );
        });

        acc.push({
          ...pkg,
          data_streams: filteredDataStreams,
          policy_templates: filteredPolicyTemplates,
        });
      }
      return acc;
    }, [] as Array<Installable<RegistrySearchResult>>);
  }
  return packageList;
}
