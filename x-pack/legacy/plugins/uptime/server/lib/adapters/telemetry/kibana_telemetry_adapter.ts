/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

interface UptimeTelemetry {
  overview_page: number;
  monitor_page: number;
}

interface UptimeTelemetryCollector {
  [key: number]: UptimeTelemetry;
}

// seconds in an hour
const BUCKET_SIZE = 3600;
// take buckets in the last day
const BUCKET_NUMBER = 24;

export class KibanaTelemetryAdapter {
  public static registerUsageCollector = (usageCollector: UsageCollectionSetup) => {
    const collector = KibanaTelemetryAdapter.initUsageCollector(usageCollector);
    usageCollector.registerCollector(collector);
  };

  public static initUsageCollector(usageCollector: UsageCollectionSetup) {
    return usageCollector.makeUsageCollector({
      type: 'uptime',
      fetch: async () => {
        const report = this.getReport();
        return { last_24_hours: { hits: { ...report } } };
      },
      isReady: () => true,
    });
  }

  public static countOverview() {
    const bucket = this.getBucketToIncrement();
    this.collector[bucket].overview_page += 1;
  }

  public static countMonitor() {
    const bucket = this.getBucketToIncrement();
    this.collector[bucket].monitor_page += 1;
  }

  private static collector: UptimeTelemetryCollector = {};

  private static getReport() {
    const minBucket = this.getCollectorWindow();
    Object.keys(this.collector)
      .map(key => parseInt(key, 10))
      .filter(key => key < minBucket)
      .forEach(oldBucket => {
        delete this.collector[oldBucket];
      });

    return Object.values(this.collector).reduce(
      (acc, cum) => ({
        overview_page: acc.overview_page + cum.overview_page,
        monitor_page: acc.monitor_page + cum.monitor_page,
      }),
      { overview_page: 0, monitor_page: 0 }
    );
  }

  private static getBucket() {
    const nowInSeconds = Math.round(Date.now() / 1000);
    return nowInSeconds - (nowInSeconds % BUCKET_SIZE);
  }

  private static getBucketToIncrement() {
    const bucketId = this.getBucket();
    if (!this.collector[bucketId]) {
      this.collector[bucketId] = {
        overview_page: 0,
        monitor_page: 0,
      };
    }
    return bucketId;
  }

  private static getCollectorWindow() {
    return this.getBucket() - BUCKET_SIZE * (BUCKET_NUMBER - 1);
  }
}
