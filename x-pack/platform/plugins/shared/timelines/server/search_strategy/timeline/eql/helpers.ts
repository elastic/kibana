/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import { TimelineEqlRequestOptions } from '../../../../common/api/search_strategy/timeline/eql';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import {
  EqlSearchResponse,
  EqlSequence,
  EventHit,
  TimelineEdges,
} from '../../../../common/search_strategy';
import { TimelineEqlResponse } from '../../../../common/search_strategy/timeline/events/eql';
import { inspectStringifyObject } from '../../../utils/build_query';
import { formatTimelineData } from '../factory/helpers/format_timeline_data';

export const buildEqlDsl = (options: TimelineEqlRequestOptions): Record<string, unknown> => {
  if (options.pagination && options.pagination.querySize > DEFAULT_MAX_TABLE_QUERY_SIZE) {
    throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
  }

  const requestFilter: unknown[] = options.timerange
    ? [
        {
          range: {
            [options.timestampField ?? '@timestamp']: {
              gte: options.timerange.from,
              lte: options.timerange.to,
              format: 'strict_date_optional_time',
            },
          },
        },
      ]
    : [];

  return {
    allow_no_indices: true,
    index: options.defaultIndex,
    ignore_unavailable: true,
    body: {
      event_category_field: options.eventCategoryField ?? 'event.category',
      filter: {
        bool: {
          filter: requestFilter,
        },
      },
      query: options.filterQuery,
      ...(!isEmpty(options.tiebreakerField)
        ? {
            tiebreaker_field: options.tiebreakerField,
          }
        : {}),
      size: options.size ?? 100,
      timestamp_field: options.timestampField ?? '@timestamp',
      fields: [
        { field: '*', include_unmapped: true },
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
    },
  };
};
const parseSequences = async (sequences: Array<EqlSequence<unknown>>, fieldRequested: string[]) => {
  let result: TimelineEdges[] = [];

  for (const [sequenceIndex, sequence] of sequences.entries()) {
    const sequenceParentId = sequence.events[0]?._id ?? null;
    const formattedEvents = await formatTimelineData(
      sequence.events as EventHit[],
      fieldRequested,
      false
    );

    const eventsWithEql = formattedEvents.map((item, eventIndex) => ({
      ...item,
      node: {
        ...item.node,
        ecs: {
          ...item.node.ecs,
          ...(sequenceParentId && {
            eql: {
              parentId: sequenceParentId,
              sequenceNumber: `${sequenceIndex}-${eventIndex}`,
            },
          }),
        },
      },
    }));

    result = result.concat(eventsWithEql);
  }

  return result;
};

export const parseEqlResponse = async (
  options: TimelineEqlRequestOptions,
  response: EqlSearchStrategyResponse<EqlSearchResponse<unknown>>
): Promise<TimelineEqlResponse> => {
  const {
    pagination: { activePage, querySize } = {
      activePage: 0,
      querySize: DEFAULT_MAX_TABLE_QUERY_SIZE,
    },
  } = options;
  let edges: TimelineEdges[] = [];

  if (response.rawResponse.hits.sequences !== undefined) {
    edges = await parseSequences(response.rawResponse.hits.sequences, options.fieldRequested);
  } else if (response.rawResponse.hits.events !== undefined) {
    edges = await formatTimelineData(
      response.rawResponse.hits.events as EventHit[],
      options.fieldRequested,
      false
    );
  }

  const inspect = {
    dsl: [inspectStringifyObject(buildEqlDsl(options))],
  };

  const startPage = activePage === 0 ? activePage : activePage * querySize;
  const endPage = startPage + querySize;

  return Promise.resolve({
    ...response,
    inspect,
    edges: edges.slice(startPage, endPage),
    totalCount: edges.length,
    pageInfo: {
      activePage: activePage ?? 0,
      querySize,
    },
  });
};
