/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorPageTitle, Ping } from '../../../../common/graphql/types';
import { UMMonitorsAdapter } from './adapter_types';

export class UMMemoryMonitorsAdapter implements UMMonitorsAdapter {
  private monitorsDB: Ping[];

  constructor(monitorsDB: Ping[]) {
    this.monitorsDB = monitorsDB;
  }

  public async getMonitors(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any> {
    return this.monitorsDB.filter(ping => {
      // const timestamp = moment(ping.timestamp).valueOf();
      throw new Error('Method not implemented.');
      // return dateRangeStart <= timestamp && timestamp <= dateRangeEnd;
    });
  }
  public async getMonitorChartsData(
    req: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
  public async getFilterBar(request: any): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async getErrorsList(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async getMonitorPageTitle(
    request: any,
    monitorId: string
  ): Promise<MonitorPageTitle | null> {
    throw new Error('Method not implemented.');
  }
}
