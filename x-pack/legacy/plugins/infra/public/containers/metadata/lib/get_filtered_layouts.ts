/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraMetadataFeature } from '../../../../common/http_api/metadata_api';
import { InfraMetricLayout } from '../../../pages/metrics/layouts/types';

export const getFilteredLayouts = (
  layouts: InfraMetricLayout[],
  metadata: Array<InfraMetadataFeature | null> | undefined
): InfraMetricLayout[] => {
  if (!metadata) {
    return layouts;
  }

  const metricMetadata: Array<string | null> = metadata
    .filter(data => data && data.source === 'metrics')
    .map(data => data && data.name);

  // After filtering out sections that can't be displayed, a layout may end up empty and can be removed.
  const filteredLayouts = layouts
    .map(layout => getFilteredLayout(layout, metricMetadata))
    .filter(layout => layout.sections.length > 0);
  return filteredLayouts;
};

export const getFilteredLayout = (
  layout: InfraMetricLayout,
  metricMetadata: Array<string | null>
): InfraMetricLayout => {
  // A section is only displayed if at least one of its requirements is met
  // All others are filtered out.
  const filteredSections = layout.sections.filter(
    section => _.intersection(section.requires, metricMetadata).length > 0
  );
  return { ...layout, sections: filteredSections };
};
