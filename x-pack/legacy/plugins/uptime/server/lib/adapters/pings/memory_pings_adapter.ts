/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, take } from 'lodash';
import { DocCount, HistogramDataPoint, Ping, PingResults } from '../../../../common/graphql/types';
import { UMPingsAdapter } from './adapter_types';

const sortPings = (sort: string) =>
  sort === 'asc'
    ? (a: Ping, b: Ping) => (Date.parse(a.timestamp) > Date.parse(b.timestamp) ? 1 : 0)
    : (a: Ping, b: Ping) => (Date.parse(a.timestamp) > Date.parse(b.timestamp) ? 0 : 1);

export class MemoryPingsAdapter implements UMPingsAdapter {
  private pingsDB: Ping[];

  constructor(pingsDB: Ping[]) {
    this.pingsDB = pingsDB;
  }

  public async getAll(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    status?: string | null,
    sort?: string | null,
    size?: number | null
  ): Promise<PingResults> {
    let pings = this.pingsDB;
    if (monitorId) {
      pings = pings.filter(ping => ping.monitor && ping.monitor.id === monitorId);
    }

    const locations =
      this.pingsDB
        .map(ping => {
          return get<string>(ping, 'observer.geo.name');
        })
        .filter(location => !location) || [];
    size = size ? size : 10;
    return {
      total: size,
      pings: take(sort ? pings.sort(sortPings(sort)) : pings, size),
      locations,
    };
  }

  // TODO: implement
  public getLatestMonitorDocs(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null
  ): Promise<Ping[]> {
    throw new Error('Method not implemented.');
  }

  // TODO: implement
  public getPingHistogram(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null | undefined,
    monitorId?: string | null | undefined
  ): Promise<HistogramDataPoint[]> {
    throw new Error('Method not implemented.');
  }

  // TODO: implement
  public getDocCount(request: any): Promise<DocCount> {
    throw new Error('Method not implemented.');
  }
}
