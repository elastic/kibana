/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_DATASET_QUALITY, DEFAULT_QUALITY_DOC_STATS } from '../constants';
import { DataStreamType, QualityIndicators } from '../types';
import { indexNameToDataStreamParts, mapPercentageToQuality } from '../utils';
import { Integration } from './integration';
import { DataStreamStatType } from './types';

interface QualityStat {
  percentage: number;
  count: number;
}

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
  degradedDocs: QualityStat;
  failedDocs: QualityStat;
  hasFailureStore?: DataStreamStatType['hasFailureStore'];

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
    this.failedDocs = dataStreamStat.failedDocs;
    this.hasFailureStore = dataStreamStat.hasFailureStore;
  }

  public static create(dataStreamStat: DataStreamStatType) {
    const { type, dataset, namespace } = indexNameToDataStreamParts(dataStreamStat.name);

    const dataStreamStatProps = {
      rawName: dataStreamStat.name,
      hasFailureStore: dataStreamStat.hasFailureStore,
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
      degradedDocs: DEFAULT_QUALITY_DOC_STATS,
      failedDocs: DEFAULT_QUALITY_DOC_STATS,
    };

    return new DataStreamStat(dataStreamStatProps);
  }

  public static fromQualityStats({
    datasetName,
    degradedDocStat,
    failedDocStat,
    datasetIntegrationMap,
    totalDocs,
    hasFailureStore,
  }: {
    datasetName: string;
    degradedDocStat: QualityStat;
    failedDocStat: QualityStat;
    datasetIntegrationMap: Record<string, { integration: Integration; title: string }>;
    totalDocs: number;
    hasFailureStore?: boolean;
  }) {
    const { type, dataset, namespace } = indexNameToDataStreamParts(datasetName);

    const dataStreamStatProps = {
      rawName: datasetName,
      hasFailureStore,
      type,
      name: dataset,
      title: datasetIntegrationMap[dataset]?.title || dataset,
      namespace,
      integration: datasetIntegrationMap[dataset]?.integration,
      quality: mapPercentageToQuality([degradedDocStat.percentage, failedDocStat.percentage]),
      docsInTimeRange: totalDocs,
      degradedDocs: {
        percentage: degradedDocStat.percentage,
        count: degradedDocStat.count,
      },
      failedDocs: {
        percentage: failedDocStat.percentage,
        count: failedDocStat.count,
      },
    };

    return new DataStreamStat(dataStreamStatProps);
  }

  public static calculateFilteredSize({ sizeBytes, totalDocs, docsInTimeRange }: DataStreamStat) {
    const avgDocSize = sizeBytes && totalDocs ? sizeBytes / totalDocs : 0;
    return avgDocSize * (docsInTimeRange ?? 0);
  }
}
