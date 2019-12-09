/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseAdapter } from '../database';
import { UMMonitorStatesAdapter, GetMonitorStatesResult, CursorPagination } from './adapter_types';
import { StatesIndexStatus } from '../../../../common/graphql/types';
import { INDEX_NAMES, CONTEXT_DEFAULTS } from '../../../../common/constants';
import { fetchPage } from './search';
import { MonitorGroupIterator } from './search/monitor_group_iterator';
import { Snapshot } from '../../../../common/runtime_types';
import {QueryContext} from "./search/query_context";


export class ElasticsearchMonitorStatesAdapter implements UMMonitorStatesAdapter {
  constructor(private readonly database: DatabaseAdapter) {
    this.database = database;
  }

  // Gets a page of monitor states.
  public async getMonitorStates(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination = CONTEXT_DEFAULTS.CURSOR_PAGINATION,
    filters?: string | null,
    statusFilter?: string
  ): Promise<GetMonitorStatesResult> {
    const size = 10;

    const queryContext = new QueryContext(
      this.database,
      request,
      dateRangeStart,
      dateRangeEnd,
      pagination,
      filters && filters !== '' ? JSON.parse(filters) : null,
      size,
      statusFilter,
    );

    const page = await fetchPage(queryContext);

    return {
      summaries: page.items,
      nextPagePagination: jsonifyPagination(page.nextPagePagination),
      prevPagePagination: jsonifyPagination(page.prevPagePagination),
    };
  }

  public async getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string,
    statusFilter?: string
  ): Promise<Snapshot> {
    const context = new QueryContext(
      this.database,
      request,
      dateRangeStart,
      dateRangeEnd,
      CONTEXT_DEFAULTS.CURSOR_PAGINATION,
      filters && filters !== '' ? JSON.parse(filters) : null,
      CONTEXT_DEFAULTS.MAX_MONITORS_FOR_SNAPSHOT_COUNT,
      statusFilter,
    );

    console.log("SNAP COUNT");

    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        size: 0,
        query: {
          bool: { filter: (await context.dateAndCustomFilters()) },
        },
        aggs: {
          unique: {
            cardinality: {
              field: "monitor.id",
              precision_threshold: 40000,
            }
          },
          down: {
            filter: {
              match: {"monitor.status": "down"},
            },
            aggs: {
              unique: {
                cardinality: {
                  field: "monitor.id",
                  precision_threshold: 40000,
                }
              }
            }
          }
        }
      }
    };

    console.log("QUERY", JSON.stringify(params.body));

    const statistics = await context.database.search(context.request, params);
    const uniqueDown = statistics.aggregations.down.unique.value;
    const total = statistics.aggregations.unique.value;

    console.log("ROUGH U/D",total-uniqueDown, uniqueDown);

    return {
      total,
      up: total-uniqueDown,
      down: uniqueDown,
      mixed: 0,
    }
  }

  public async statesIndexExists(request: any): Promise<StatesIndexStatus> {
    // TODO: adapt this to the states index in future release
    const {
      _shards: { total },
      count,
    } = await this.database.count(request, { index: INDEX_NAMES.HEARTBEAT });
    return {
      indexExists: total > 0,
      docCount: {
        count,
      },
    };
  }
}

// To simplify the handling of the group of pagination vars they're passed back to the client as a string
const jsonifyPagination = (p: any): string | null => {
  if (!p) {
    return null;
  }

  return JSON.stringify(p);
};
