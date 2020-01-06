/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  cloneDeep,
  get,
  getOr,
  has,
  isEmpty,
  isNumber,
  isObject,
  isString,
  last,
  merge,
  uniq,
} from 'lodash/fp';

import {
  DetailItem,
  EcsEdges,
  LastEventTimeData,
  TimelineData,
  TimelineDetailsData,
  TimelineEdges,
  EventsOverTimeData,
} from '../../graphql/types';
import { baseCategoryFields } from '../../utils/beat_schema/8.0.0';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { mergeFieldsWithHit, inspectStringifyObject } from '../../utils/build_query';
import { eventFieldsMap } from '../ecs_fields';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildDetailsQuery, buildTimelineQuery } from './query.dsl';
import { buildLastEventTimeQuery } from './query.last_event_time.dsl';
import {
  EventHit,
  EventsAdapter,
  LastEventTimeHit,
  LastEventTimeRequestOptions,
  RequestDetailsOptions,
  TimelineRequestOptions,
  EventsActionGroupData,
} from './types';
import { buildEventsOverTimeQuery } from './query.events_over_time.dsl';
import { MatrixOverTimeHistogramData } from '../../../public/graphql/types';

export class ElasticsearchEventsAdapter implements EventsAdapter {
  constructor(private readonly framework: FrameworkAdapter) { }

  public async getTimelineData(
    request: FrameworkRequest,
    options: TimelineRequestOptions
  ): Promise<TimelineData> {
    const queryOptions = cloneDeep(options);
    queryOptions.fields = uniq([
      ...queryOptions.fieldRequested,
      ...reduceFields(queryOptions.fields, eventFieldsMap),
    ]);
    delete queryOptions.fieldRequested;
    const dsl = buildTimelineQuery(queryOptions);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'hits.total.value', response);
    const hits = response.hits.hits;
    const timelineEdges: TimelineEdges[] = hits.map(hit =>
      formatTimelineData(options.fieldRequested, options.fields, hit, eventFieldsMap)
    );
    const hasNextPage = timelineEdges.length === limit + 1;
    const edges = hasNextPage ? timelineEdges.splice(0, limit) : timelineEdges;
    const lastCursor = get('cursor', last(edges));
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return { edges, inspect, pageInfo: { hasNextPage, endCursor: lastCursor }, totalCount };
  }

  public async getTimelineDetails(
    request: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<TimelineDetailsData> {
    const dsl = buildDetailsQuery(options.indexName, options.eventId);
    const searchResponse = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );

    const sourceData = getOr({}, 'hits.hits.0._source', searchResponse);
    const hitsData = getOr({}, 'hits.hits.0', searchResponse);
    delete hitsData._source;
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(searchResponse)],
    };
    const data = getDataFromHits(merge(sourceData, hitsData));
    return {
      data,
      inspect,
    };
  }

  public async getLastEventTimeData(
    request: FrameworkRequest,
    options: LastEventTimeRequestOptions
  ): Promise<LastEventTimeData> {
    const dsl = buildLastEventTimeQuery(options);
    const response = await this.framework.callWithRequest<LastEventTimeHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      lastSeen: getOr(null, 'aggregations.last_seen_event.value_as_string', response),
    };
  }

  public async getEventsOverTime(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<EventsOverTimeData> {
    const dsl = buildEventsOverTimeQuery(options);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      dsl
    );
    const totalCount = getOr(0, 'hits.total.value', response);
    const eventsOverTimeBucket = getOr([], 'aggregations.eventActionGroup.buckets', response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    return {
      inspect,
      EventsOverTimeByModule: getEventsOverTimeByActionName(eventsOverTimeBucket),
      totalCount,
    };
  }
}

/**
 * Not in use at the moment,
 * reserved this parser for next feature of switchign between total events and grouped events
 */
export const getTotalEventsOverTime = (
  data: EventsActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  return data && data.length > 0
    ? data.map<MatrixOverTimeHistogramData>(({ key, doc_count }) => ({
      x: key,
      y: doc_count,
      g: 'total events',
    }))
    : [];
};

const getEventsOverTimeByActionName = (
  data: EventsActionGroupData[]
): MatrixOverTimeHistogramData[] => {
  let result: MatrixOverTimeHistogramData[] = [];
  data.forEach(({ key: group, events }) => {
    const eventsData = getOr([], 'buckets', events).map(
      ({ key, doc_count }: { key: number; doc_count: number }) => ({
        x: key,
        y: doc_count,
        g: group,
      })
    );
    result = [...result, ...eventsData];
  });

  return result;
};

export const formatEventsData = (
  fields: readonly string[],
  hit: EventHit,
  fieldMap: Readonly<Record<string, string>>
) =>
  fields.reduce<EcsEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      flattenedFields.node._index = hit._index;
      if (hit.sort && hit.sort.length > 1) {
        flattenedFields.cursor.value = hit.sort[0];
        flattenedFields.cursor.tiebreaker = hit.sort[1];
      }
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: { _id: '' },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );

export const formatTimelineData = (
  dataFields: readonly string[],
  ecsFields: readonly string[],
  hit: EventHit,
  fieldMap: Readonly<Record<string, string>>
) =>
  uniq([...ecsFields, ...dataFields]).reduce<TimelineEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      flattenedFields.node._index = hit._index;
      flattenedFields.node.ecs._id = hit._id;
      flattenedFields.node.ecs._index = hit._index;
      if (hit.sort && hit.sort.length > 1) {
        flattenedFields.cursor.value = hit.sort[0];
        flattenedFields.cursor.tiebreaker = hit.sort[1];
      }
      return mergeTimelineFieldsWithHit(
        fieldName,
        flattenedFields,
        fieldMap,
        hit,
        dataFields,
        ecsFields
      );
    },
    {
      node: { ecs: { _id: '' }, data: [], _id: '', _index: '' },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );

const specialFields = ['_id', '_index', '_type', '_score'];

const mergeTimelineFieldsWithHit = <T>(
  fieldName: string,
  flattenedFields: T,
  fieldMap: Readonly<Record<string, string>>,
  hit: { _source: {} },
  dataFields: readonly string[],
  ecsFields: readonly string[]
) => {
  if (fieldMap[fieldName] != null || dataFields.includes(fieldName)) {
    const esField = dataFields.includes(fieldName) ? fieldName : fieldMap[fieldName];
    if (has(esField, hit._source) || specialFields.includes(esField)) {
      const objectWithProperty = {
        node: {
          ...get('node', flattenedFields),
          data: dataFields.includes(fieldName)
            ? [
              ...get('node.data', flattenedFields),
              {
                field: fieldName,
                value: specialFields.includes(esField)
                  ? get(esField, hit)
                  : get(esField, hit._source),
              },
            ]
            : get('node.data', flattenedFields),
          ecs: ecsFields.includes(fieldName)
            ? {
              ...get('node.ecs', flattenedFields),
              ...fieldName
                .split('.')
                .reduceRight((obj, next) => ({ [next]: obj }), get(esField, hit._source)),
            }
            : get('node.ecs', flattenedFields),
        },
      };
      return merge(flattenedFields, objectWithProperty);
    } else {
      return flattenedFields;
    }
  } else {
    return flattenedFields;
  }
};

export const getFieldCategory = (field: string): string => {
  const fieldCategory = field.split('.')[0];
  if (!isEmpty(fieldCategory) && baseCategoryFields.includes(fieldCategory)) {
    return 'base';
  }
  return fieldCategory;
};

const getDataFromHits = (sources: EventSource, category?: string, path?: string): DetailItem[] =>
  Object.keys(sources).reduce<DetailItem[]>((accumulator, source) => {
    const item: EventSource = get(source, sources);
    if (Array.isArray(item) || isString(item) || isNumber(item)) {
      const field = path ? `${path}.${source}` : source;
      const fieldCategory = getFieldCategory(field);
      return [
        ...accumulator,
        {
          category: fieldCategory,
          field,
          values: item,
          originalValue: item,
        } as DetailItem,
      ];
    } else if (isObject(item)) {
      return [
        ...accumulator,
        ...getDataFromHits(item, category || source, path ? `${path}.${source}` : source),
      ];
    }
    return accumulator;
  }, []);
