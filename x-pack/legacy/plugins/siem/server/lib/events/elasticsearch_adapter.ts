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
  EventsData,
  KpiItem,
  LastEventTimeData,
  TimelineData,
  TimelineDetailsData,
  TimelineEdges,
} from '../../graphql/types';
import { getDocumentation, getIndexAlias, hasDocumentation } from '../../utils/beat_schema';
import { baseCategoryFields } from '../../utils/beat_schema/8.0.0';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { eventFieldsMap } from '../ecs_fields';
import {
  FrameworkAdapter,
  FrameworkRequest,
  MappingProperties,
  RequestOptions,
} from '../framework';
import { TermAggregation } from '../types';

import { buildDetailsQuery, buildQuery } from './query.dsl';
import { buildLastEventTimeQuery } from './query.last_event_time.dsl';
import {
  EventHit,
  EventsAdapter,
  EventsRequestOptions,
  LastEventTimeHit,
  LastEventTimeRequestOptions,
  RequestDetailsOptions,
} from './types';

export class ElasticsearchEventsAdapter implements EventsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getEvents(request: FrameworkRequest, options: RequestOptions): Promise<EventsData> {
    const queryOptions = cloneDeep(options);
    queryOptions.fields = reduceFields(options.fields, eventFieldsMap);
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      buildQuery(queryOptions)
    );

    const kpiEventType: KpiItem[] =
      response.aggregations && response.aggregations.count_event_type
        ? response.aggregations.count_event_type.buckets.map(item => ({
            value: item.key,
            count: item.doc_count,
          }))
        : [];
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'hits.total.value', response);
    const hits = response.hits.hits;
    const eventsEdges: EcsEdges[] = hits.map(hit =>
      formatEventsData(options.fields, hit, eventFieldsMap)
    );
    const hasNextPage = eventsEdges.length === limit + 1;
    const edges = hasNextPage ? eventsEdges.splice(0, limit) : eventsEdges;
    const lastCursor = get('cursor', last(edges));
    return { kpiEventType, edges, totalCount, pageInfo: { hasNextPage, endCursor: lastCursor } };
  }

  public async getTimelineData(
    request: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<TimelineData> {
    const queryOptions = cloneDeep(options);
    queryOptions.fields = uniq([
      ...queryOptions.fieldRequested,
      ...reduceFields(queryOptions.fields, eventFieldsMap),
    ]);
    delete queryOptions.fieldRequested;
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      buildQuery(queryOptions)
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
    return { edges, totalCount, pageInfo: { hasNextPage, endCursor: lastCursor } };
  }

  public async getTimelineDetails(
    request: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<TimelineDetailsData> {
    const [mapResponse, searchResponse] = await Promise.all([
      this.framework.callWithRequest(request, 'indices.getMapping', {
        allowNoIndices: true,
        ignoreUnavailable: true,
        index: options.indexName,
      }),
      this.framework.callWithRequest<EventHit, TermAggregation>(
        request,
        'search',
        buildDetailsQuery(options.indexName, options.eventId)
      ),
    ]);

    const sourceData = getOr({}, 'hits.hits.0._source', searchResponse);
    const hitsData = getOr({}, 'hits.hits.0', searchResponse);
    delete hitsData._source;

    return {
      data: getSchemaFromData(
        {
          ...addBasicElasticSearchProperties(),
          ...getOr({}, [options.indexName, 'mappings', 'properties'], mapResponse),
        },
        getDataFromHits(merge(sourceData, hitsData)),
        getIndexAlias(options.defaultIndex, options.indexName)
      ),
    };
  }

  public async getLastEventTimeData(
    request: FrameworkRequest,
    options: LastEventTimeRequestOptions
  ): Promise<LastEventTimeData> {
    const response = await this.framework.callWithRequest<LastEventTimeHit, TermAggregation>(
      request,
      'search',
      buildLastEventTimeQuery(options)
    );

    return {
      lastSeen: getOr(null, 'aggregations.last_seen_event.value_as_string', response),
    };
  }
}

export const formatEventsData = (
  fields: ReadonlyArray<string>,
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
  dataFields: ReadonlyArray<string>,
  ecsFields: ReadonlyArray<string>,
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
  dataFields: ReadonlyArray<string>,
  ecsFields: ReadonlyArray<string>
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

const getDataFromHits = (sources: EventSource, category?: string, path?: string): DetailItem[] =>
  Object.keys(sources).reduce<DetailItem[]>((accumulator, source) => {
    const item = get(source, sources);
    if (Array.isArray(item) || isString(item) || isNumber(item)) {
      const field = path ? `${path}.${source}` : source;
      category = field.split('.')[0];
      if (isEmpty(category) && baseCategoryFields.includes(category)) {
        category = 'base';
      }
      return [
        ...accumulator,
        {
          category,
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

const getSchemaFromData = (
  properties: MappingProperties,
  data: DetailItem[],
  index: string,
  path?: string
): DetailItem[] =>
  !isEmpty(properties)
    ? Object.keys(properties).reduce<DetailItem[]>((accumulator, property) => {
        const item = get(property, properties);
        const field = path ? `${path}.${property}` : property;
        const dataFilterItem = data.filter(dataItem => dataItem.field === field);
        if (item.properties == null && dataFilterItem.length === 1) {
          const dataItem = dataFilterItem[0];
          const dataFromMapping = {
            type: get([property, 'type'], properties),
          };
          return [
            ...accumulator,
            {
              ...dataItem,
              ...(hasDocumentation(index, field)
                ? merge(getDocumentation(index, field), dataFromMapping)
                : dataFromMapping),
            },
          ];
        } else if (item.properties != null) {
          return [...accumulator, ...getSchemaFromData(item.properties, data, index, field)];
        }
        return accumulator;
      }, [])
    : data;

const addBasicElasticSearchProperties = () => ({
  _id: {
    type: 'keyword',
  },
  _index: {
    type: 'keyword',
  },
  _type: {
    type: 'keyword',
  },
  _score: {
    type: 'long',
  },
});
