/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamDocsStat } from '../api_types';
import { DEFAULT_DATASET_QUALITY, DEFAULT_DEGRADED_DOCS } from '../constants';
import { DataStreamType, QualityIndicators } from '../types';
import { indexNameToDataStreamParts, mapPercentageToQuality } from '../utils';
import { Integration } from './integration';
import { DataStreamStatType } from './types';

export class DataStreamStat {
  rawName: string;
  type: DataStreamType;
  name: DataStreamStatType['name'];
  namespace: string;
  title?: string;
  size?: DataStreamStatType['size']; // total datastream size
  sizeBytes?: DataStreamStatType['sizeBytes']; // total datastream size
  lastActivity?: DataStreamStatType['lastActivity'];
  userPrivileges?: DataStreamStatType['userPrivileges'];
  totalDocs?: DataStreamStatType['totalDocs']; // total datastream docs count
  integration?: Integration;
  quality: QualityIndicators;
  docsInTimeRange?: number;
  degradedDocs: {
    percentage: number;
    count: number;
  };

  private constructor(dataStreamStat: DataStreamStat) {
    this.rawName = dataStreamStat.rawName;
    this.type = dataStreamStat.type;
    this.name = dataStreamStat.name;
    this.title = dataStreamStat.title ?? dataStreamStat.name;
    this.namespace = dataStreamStat.namespace;
    this.size = dataStreamStat.size;
    this.sizeBytes = dataStreamStat.sizeBytes;
    this.lastActivity = dataStreamStat.lastActivity;
    this.userPrivileges = dataStreamStat.userPrivileges;
    this.totalDocs = dataStreamStat.totalDocs;
    this.integration = dataStreamStat.integration;
    this.quality = dataStreamStat.quality;
    this.docsInTimeRange = dataStreamStat.docsInTimeRange;
    this.degradedDocs = dataStreamStat.degradedDocs;
  }

  public static create(dataStreamStat: DataStreamStatType) {
    const { type, dataset, namespace } = indexNameToDataStreamParts(dataStreamStat.name);

    const dataStreamStatProps = {
      rawName: dataStreamStat.name,
      type,
      name: dataset,
      title: dataset,
      namespace,
      size: dataStreamStat.size,
      sizeBytes: dataStreamStat.sizeBytes,
      lastActivity: dataStreamStat.lastActivity,
      userPrivileges: dataStreamStat.userPrivileges,
      totalDocs: dataStreamStat.totalDocs,
      quality: DEFAULT_DATASET_QUALITY,
      degradedDocs: DEFAULT_DEGRADED_DOCS,
    };

    return new DataStreamStat(dataStreamStatProps);
  }

  public static fromDegradedDocStat({
    degradedDocStat,
    datasetIntegrationMap,
    totalDocs,
  }: {
    degradedDocStat: DataStreamDocsStat & { percentage: number };
    datasetIntegrationMap: Record<string, { integration: Integration; title: string }>;
    totalDocs: number;
  }) {
    const { type, dataset, namespace } = indexNameToDataStreamParts(degradedDocStat.dataset);

    const dataStreamStatProps = {
      rawName: degradedDocStat.dataset,
      type,
      name: dataset,
      title: datasetIntegrationMap[dataset]?.title || dataset,
      namespace,
      integration: datasetIntegrationMap[dataset]?.integration,
      quality: mapPercentageToQuality(degradedDocStat.percentage),
      docsInTimeRange: totalDocs,
      degradedDocs: {
        percentage: degradedDocStat.percentage,
        count: degradedDocStat.count,
      },
    };

    return new DataStreamStat(dataStreamStatProps);
  }

  public static calculateFilteredSize({ sizeBytes, totalDocs, docsInTimeRange }: DataStreamStat) {
    const avgDocSize = sizeBytes && totalDocs ? sizeBytes / totalDocs : 0;
    return avgDocSize * (docsInTimeRange ?? 0);
  }

  public static calculatePercentage({ totalDocs, count }: { totalDocs?: number; count?: number }) {
    return totalDocs && count ? (count / totalDocs) * 100 : 0;
  }
}
