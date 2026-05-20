/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Condition } from '@kbn/streamlang';
import { conditionToESQL } from '@kbn/streamlang';

export interface PartitionStats {
  name: string;
  matchingDocs: number;
  exclusiveDocs: number;
  overlappingDocs: number;
}

export interface PartitioningMetrics {
  totalDocuments: number;
  coverage: number;
  overlapScore: number;
  perPartitionStats: PartitionStats[];
  partitionCount: number;
}

const buildPartitionWhereClause = (condition: Condition): string => {
  return conditionToESQL(condition);
};

const extractCount = (values: unknown[][]): number => {
  if (values.length > 0 && values[0][0] != null) {
    return Number(values[0][0]);
  }
  return 0;
};

const runEsqlCount = async (esClient: Client, query: string): Promise<number> => {
  const response = await esClient.esql.query({
    query: `SET unmapped_fields = "load"; ${query}`,
    format: 'json',
  });
  const body = response as unknown as { values: unknown[][] };
  return extractCount(body.values);
};

const countDocuments = async (esClient: Client, streamName: string): Promise<number> => {
  const query = `FROM ${streamName} | STATS count = COUNT(*)`;
  return runEsqlCount(esClient, query);
};

const countMatching = async (
  esClient: Client,
  streamName: string,
  condition: Condition
): Promise<number> => {
  const where = buildPartitionWhereClause(condition);
  const query = `FROM ${streamName} | WHERE ${where} | STATS count = COUNT(*)`;
  return runEsqlCount(esClient, query);
};

const countUnion = async (
  esClient: Client,
  streamName: string,
  partitions: Array<{ condition: Condition }>
): Promise<number> => {
  if (partitions.length === 0) return 0;

  const whereClauses = partitions.map((p) => `(${buildPartitionWhereClause(p.condition)})`);
  const query = `FROM ${streamName} | WHERE ${whereClauses.join(' OR ')} | STATS count = COUNT(*)`;
  return runEsqlCount(esClient, query);
};

const countOverlap = async (
  esClient: Client,
  streamName: string,
  partitions: Array<{ condition: Condition }>
): Promise<number> => {
  if (partitions.length < 2) return 0;

  const pairConditions: string[] = [];
  for (let i = 0; i < partitions.length; i++) {
    for (let j = i + 1; j < partitions.length; j++) {
      const a = `(${buildPartitionWhereClause(partitions[i].condition)})`;
      const b = `(${buildPartitionWhereClause(partitions[j].condition)})`;
      pairConditions.push(`(${a} AND ${b})`);
    }
  }

  const query = `FROM ${streamName} | WHERE ${pairConditions.join(
    ' OR '
  )} | STATS count = COUNT(*)`;
  return runEsqlCount(esClient, query);
};

const countExclusive = async (
  esClient: Client,
  streamName: string,
  condition: Condition,
  otherPartitions: Array<{ condition: Condition }>
): Promise<number> => {
  const where = buildPartitionWhereClause(condition);

  if (otherPartitions.length === 0) {
    const query = `FROM ${streamName} | WHERE ${where} | STATS count = COUNT(*)`;
    return runEsqlCount(esClient, query);
  }

  const notOthers = otherPartitions
    .map((p) => `NOT (${buildPartitionWhereClause(p.condition)})`)
    .join(' AND ');

  const query = `FROM ${streamName} | WHERE ${where} AND ${notOthers} | STATS count = COUNT(*)`;
  return runEsqlCount(esClient, query);
};

export const calculatePartitioningMetrics = async (
  esClient: Client,
  streamName: string,
  partitions: Array<{ name: string; condition: Condition }>
): Promise<PartitioningMetrics> => {
  const totalDocuments = await countDocuments(esClient, streamName);

  if (totalDocuments === 0 || partitions.length === 0) {
    return {
      totalDocuments,
      coverage: 0,
      overlapScore: 0,
      perPartitionStats: [],
      partitionCount: partitions.length,
    };
  }

  const unionCount = await countUnion(esClient, streamName, partitions);
  const overlapCount = await countOverlap(esClient, streamName, partitions);

  const coverage = unionCount / totalDocuments;
  const overlapScore = unionCount > 0 ? overlapCount / unionCount : 0;

  const perPartitionStats: PartitionStats[] = [];
  for (let i = 0; i < partitions.length; i++) {
    const matchingDocs = await countMatching(esClient, streamName, partitions[i].condition);
    const others = partitions.filter((_, j) => j !== i);
    const exclusiveDocs = await countExclusive(
      esClient,
      streamName,
      partitions[i].condition,
      others
    );
    const overlappingDocs = matchingDocs - exclusiveDocs;

    perPartitionStats.push({
      name: partitions[i].name,
      matchingDocs,
      exclusiveDocs,
      overlappingDocs,
    });
  }

  return {
    totalDocuments,
    coverage,
    overlapScore,
    perPartitionStats,
    partitionCount: partitions.length,
  };
};
