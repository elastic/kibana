/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash/fp';
import {
  EventHit,
  TimelineEdges,
  TimelineNonEcsData,
  EventSource,
} from '../../../../../common/search_strategy';
import { toStringArray } from '../../../../../common/utils/to_array';
import { getDataFromFieldsHits } from '../../../../../common/utils/field_formatters';
import { getTimestamp } from './get_timestamp';
import { getNestedParentPath } from './get_nested_parent_path';
import { buildObjectRecursive } from './build_object_recursive';
import { ECS_METADATA_FIELDS, TIMELINE_EVENTS_FIELDS } from './constants';

const createBaseTimelineEdges = (): TimelineEdges => ({
  node: {
    ecs: { _id: '' },
    data: [],
    _id: '',
    _index: '',
  },
  cursor: {
    value: '',
    tiebreaker: null,
  },
});

function deepMerge(target: EventSource, source: EventSource) {
  for (const key in source) {
    if (
      !Object.prototype.hasOwnProperty.call(source, key) ||
      key === '__proto__' ||
      key === 'constructor'
    )
      // eslint-disable-next-line no-continue
      continue;
    if (source[key] instanceof Object && target[key] instanceof Object) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const processMetadataField = (fieldName: string, hit: EventHit): TimelineNonEcsData[] => [
  {
    field: fieldName,
    value: toStringArray(get(fieldName, hit)),
  },
];

const processFieldData = (
  fieldName: string,
  hit: EventHit,
  nestedParentFieldName?: string
): TimelineNonEcsData[] => {
  const fieldToEval = nestedParentFieldName
    ? { [nestedParentFieldName]: hit.fields[nestedParentFieldName] }
    : { [fieldName]: hit.fields[fieldName] };

  const formattedData = getDataFromFieldsHits(fieldToEval);
  const fieldsData: TimelineNonEcsData[] = [];
  return formattedData.reduce((agg, { field, values }) => {
    if (field.includes(fieldName)) {
      agg.push({
        field,
        value: values,
      });
    }
    return agg;
  }, fieldsData);
};

export const formatTimelineData = async (
  hits: EventHit[],
  fieldRequested: readonly string[],
  excludeEcsData: boolean
): Promise<TimelineEdges[]> => {
  const ecsFields = excludeEcsData ? [] : TIMELINE_EVENTS_FIELDS;

  const uniqueFields = new Set([...ecsFields, ...fieldRequested]);
  const dataFieldSet = new Set(fieldRequested);
  const ecsFieldSet = new Set(ecsFields);

  const results: TimelineEdges[] = new Array(hits.length);

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (hit._id) {
      const result = createBaseTimelineEdges();

      result.node._id = hit._id;
      result.node._index = hit._index;
      result.node.ecs._id = hit._id;
      result.node.ecs.timestamp = getTimestamp(hit);
      result.node.ecs._index = hit._index;

      if (hit.sort?.length > 1) {
        result.cursor.value = hit.sort[0];
        result.cursor.tiebreaker = hit.sort[1];
      }

      result.node.data = [];

      for (const fieldName of uniqueFields) {
        const nestedParentPath = getNestedParentPath(fieldName, hit.fields);
        const isEcs = ECS_METADATA_FIELDS.includes(fieldName);
        if (!nestedParentPath && !has(fieldName, hit.fields) && !isEcs) {
          // eslint-disable-next-line no-continue
          continue;
        }

        if (dataFieldSet.has(fieldName)) {
          const values = isEcs
            ? processMetadataField(fieldName, hit)
            : processFieldData(fieldName, hit, nestedParentPath);

          result.node.data.push(...values);
        }

        if (ecsFieldSet.has(fieldName)) {
          deepMerge(result.node.ecs, buildObjectRecursive(fieldName, hit.fields));
        }
      }

      results[i] = result;
    } else {
      results[i] = createBaseTimelineEdges();
    }
  }

  return results;
};
