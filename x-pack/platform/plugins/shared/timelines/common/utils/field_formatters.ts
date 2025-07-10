/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import {
  ecsFieldMap,
  EcsFieldMap,
} from '@kbn/rule-registry-plugin/common/assets/field_maps/ecs_field_map';
import {
  technicalRuleFieldMap,
  TechnicalRuleFieldMap,
} from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import { legacyExperimentalFieldMap, ExperimentalRuleFieldMap } from '@kbn/alerts-as-data-utils';
import { Fields, TimelineEventsDetailsItem } from '../search_strategy';
import { toObjectArrayOfStrings, toStringArray } from './to_array';
import { ENRICHMENT_DESTINATION_PATH } from '../constants';

export const baseCategoryFields = ['@timestamp', 'labels', 'message', 'tags'];
const nonFlattenedFormatParamsFields = ['related_integrations', 'threat_mapping'];

export const getFieldCategory = (field: string): string => {
  const fieldCategory = field.split('.')[0];
  if (!isEmpty(fieldCategory) && baseCategoryFields.includes(fieldCategory)) {
    return 'base';
  }
  return fieldCategory;
};

export const formatGeoLocation = (item: unknown[]) => {
  const itemGeo = item.length > 0 ? (item[0] as { coordinates: number[] }) : null;
  if (itemGeo != null && !isEmpty(itemGeo.coordinates)) {
    try {
      return toStringArray({
        lon: itemGeo.coordinates[0],
        lat: itemGeo.coordinates[1],
      });
    } catch {
      return toStringArray(item);
    }
  }
  return toStringArray(item);
};

export const isGeoField = (field: string) =>
  field.includes('geo.location') || field.includes('geoip.location');

export const isRuleParametersFieldOrSubfield = (field: string, prependField?: string) =>
  (prependField?.includes(ALERT_RULE_PARAMETERS) || field === ALERT_RULE_PARAMETERS) &&
  !nonFlattenedFormatParamsFields.includes(field);

export const isThreatEnrichmentFieldOrSubfield = (field: string, prependField?: string) =>
  prependField?.includes(ENRICHMENT_DESTINATION_PATH) || field === ENRICHMENT_DESTINATION_PATH;

// Helper functions
const createFieldItem = (
  fieldCategory: string,
  field: string,
  values: string[],
  isObjectArray: boolean
): TimelineEventsDetailsItem => ({
  category: fieldCategory,
  field,
  values,
  originalValue: values,
  isObjectArray,
});

const processGeoField = (
  field: string,
  item: unknown[],
  fieldCategory: string
): TimelineEventsDetailsItem => {
  const formattedLocation = formatGeoLocation(item);
  return createFieldItem(fieldCategory, field, formattedLocation, true);
};

const processSimpleField = (
  dotField: string,
  strArr: string[],
  isObjectArray: boolean,
  fieldCategory: string
): TimelineEventsDetailsItem => createFieldItem(fieldCategory, dotField, strArr, isObjectArray);

const processNestedFields = (
  item: unknown,
  dotField: string,
  fieldCategory: string,
  prependDotField: boolean
): TimelineEventsDetailsItem[] => {
  if (Array.isArray(item)) {
    return item.flatMap((curr) =>
      getDataFromFieldsHits(curr as Fields, prependDotField ? dotField : undefined, fieldCategory)
    );
  }

  return getDataFromFieldsHits(
    item as Fields,
    prependDotField ? dotField : undefined,
    fieldCategory
  );
};

type DisjointFieldNames = 'ecs.version' | 'event.action' | 'event.kind' | 'event.original';

// Memoized field maps
const fieldMaps: EcsFieldMap &
  Omit<TechnicalRuleFieldMap, DisjointFieldNames> &
  ExperimentalRuleFieldMap = {
  ...technicalRuleFieldMap,
  ...ecsFieldMap,
  ...legacyExperimentalFieldMap,
};

export const getDataFromFieldsHits = (
  fields: Fields,
  prependField?: string,
  prependFieldCategory?: string
): TimelineEventsDetailsItem[] => {
  const resultMap = new Map<string, TimelineEventsDetailsItem>();
  const fieldNames = Object.keys(fields);
  for (let i = 0; i < fieldNames.length; i++) {
    const field = fieldNames[i];
    const item: unknown[] = fields[field];
    const fieldCategory = prependFieldCategory ?? getFieldCategory(field);
    const dotField = prependField ? `${prependField}.${field}` : field;

    // Handle geo fields
    if (isGeoField(field)) {
      const geoItem = processGeoField(field, item, fieldCategory);
      resultMap.set(field, geoItem);
      // eslint-disable-next-line no-continue
      continue;
    }

    const objArrStr = toObjectArrayOfStrings(item);
    const strArr = objArrStr.map(({ str }) => str);
    const isObjectArray = objArrStr.some((o) => o.isObjectArray);

    const isEcsField = fieldMaps[field as keyof typeof fieldMaps] !== undefined;
    const isRuleParameters = isRuleParametersFieldOrSubfield(field, prependField);

    // Handle simple fields
    if (!isObjectArray || (!isEcsField && !isRuleParameters)) {
      const simpleItem = processSimpleField(dotField, strArr, isObjectArray, fieldCategory);
      resultMap.set(dotField, simpleItem);
      // eslint-disable-next-line no-continue
      continue;
    }

    // Handle threat enrichment
    if (isThreatEnrichmentFieldOrSubfield(field, prependField)) {
      const enrichmentItem = createFieldItem(fieldCategory, dotField, strArr, isObjectArray);
      resultMap.set(dotField, enrichmentItem);
    }

    // Process nested fields
    const nestedFields = processNestedFields(
      item,
      dotField,
      fieldCategory,
      isRuleParameters || isThreatEnrichmentFieldOrSubfield(field, prependField)
    );
    // Merge results
    for (const nestedItem of nestedFields) {
      const existing = resultMap.get(nestedItem.field);

      if (!existing) {
        resultMap.set(nestedItem.field, nestedItem);
        // eslint-disable-next-line no-continue
        continue;
      }

      // Merge values and originalValue arrays
      const mergedValues = existing.values?.includes(nestedItem.values?.[0] || '')
        ? existing.values
        : [...(existing.values || []), ...(nestedItem.values || [])];

      const mergedOriginal = existing.originalValue.includes(nestedItem.originalValue[0])
        ? existing.originalValue
        : [...existing.originalValue, ...nestedItem.originalValue];

      resultMap.set(nestedItem.field, {
        ...nestedItem,
        values: mergedValues,
        originalValue: mergedOriginal,
      });
    }
  }

  return Array.from(resultMap.values());
};
