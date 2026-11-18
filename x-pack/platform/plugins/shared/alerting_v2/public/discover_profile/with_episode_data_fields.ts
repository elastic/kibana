/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import {
  DATA_CONTAINER_FIELD_PREFIX,
  prefixDataViewSpecFields,
} from '@kbn/alerting-v2-episodes-ui/components/details/prefix_data_view_fields';

// Keeps only the `data.*` entries, so the source view's meta fields don't replace Discover's.
const pickDataEntries = <T>(record: Record<string, T> | undefined): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record ?? {}).filter(([name]) => name.startsWith(DATA_CONTAINER_FIELD_PREFIX))
  );

/**
 * Adds the fields of the rule source data view to a Discover data view as `data.*` fields,
 * so the episode data rows get their source types and formats.
 */
export const withEpisodeDataFields = (
  dataView: DataView,
  sourceDataView: DataView,
  fieldFormats: FieldFormatsStartCommon
): DataView => {
  const spec = dataView.toSpec();
  const dataSpec = prefixDataViewSpecFields(sourceDataView.toSpec());
  const mergedSpec: DataViewSpec = {
    ...spec,
    fields: { ...spec.fields, ...pickDataEntries(dataSpec.fields) },
    fieldFormats: { ...spec.fieldFormats, ...pickDataEntries(dataSpec.fieldFormats) },
    fieldAttrs: { ...spec.fieldAttrs, ...pickDataEntries(dataSpec.fieldAttrs) },
  };
  return new DataView({ spec: mergedSpec, fieldFormats, metaFields: dataView.metaFields });
};
