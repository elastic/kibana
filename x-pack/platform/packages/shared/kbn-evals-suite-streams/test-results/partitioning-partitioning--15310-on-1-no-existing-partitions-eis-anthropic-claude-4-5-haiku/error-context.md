# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: partitioning/partitioning.spec.ts >> Partitioning suggestion quality evaluation >> Homogeneous Logs - Partition Suggestion >> 1. no existing partitions
- Location: x-pack/platform/packages/shared/kbn-evals-suite-streams/evals/partitioning/partitioning.spec.ts:73:11

# Error details

```
ResponseError: verification_exception
	Root causes:
		verification_exception: Found 3 problems
line 1:71: first argument of [`attributes.process.id` == 91011] is [keyword] so second argument must also be [keyword] but was [integer]
line 1:109: first argument of [`attributes.process.id` == 1234] is [keyword] so second argument must also be [keyword] but was [integer]
line 1:146: first argument of [`attributes.process.id` == 5678] is [keyword] so second argument must also be [keyword] but was [integer]
```

# Test source

```ts
  1   | /*
  2   |  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
  3   |  * or more contributor license agreements. Licensed under the Elastic License
  4   |  * 2.0; you may not use this file except in compliance with the Elastic License
  5   |  * 2.0.
  6   |  */
  7   | 
  8   | import type { Client } from '@elastic/elasticsearch';
  9   | import type { Condition } from '@kbn/streamlang';
  10  | import { conditionToESQL } from '@kbn/streamlang';
  11  | 
  12  | export interface PartitionStats {
  13  |   name: string;
  14  |   matchingDocs: number;
  15  |   exclusiveDocs: number;
  16  |   overlappingDocs: number;
  17  | }
  18  | 
  19  | export interface PartitioningMetrics {
  20  |   totalDocuments: number;
  21  |   coverage: number;
  22  |   overlap: number;
  23  |   perPartitionStats: PartitionStats[];
  24  |   partitionCount: number;
  25  | }
  26  | 
  27  | const buildPartitionWhereClause = (condition: Condition): string => {
  28  |   return conditionToESQL(condition);
  29  | };
  30  | 
  31  | const extractCount = (values: unknown[][]): number => {
  32  |   if (values.length > 0 && values[0][0] != null) {
  33  |     return Number(values[0][0]);
  34  |   }
  35  |   return 0;
  36  | };
  37  | 
  38  | const runEsqlCount = async (esClient: Client, query: string): Promise<number> => {
> 39  |   const response = await esClient.esql.query({
      |                    ^ ResponseError: verification_exception
  40  |     query: `SET unmapped_fields = "load"; ${query}`,
  41  |     format: 'json',
  42  |   });
  43  |   const body = response as unknown as { values: unknown[][] };
  44  |   return extractCount(body.values);
  45  | };
  46  | 
  47  | const countDocuments = async (esClient: Client, streamName: string): Promise<number> => {
  48  |   const query = `FROM ${streamName} | STATS count = COUNT(*)`;
  49  |   return runEsqlCount(esClient, query);
  50  | };
  51  | 
  52  | const countMatching = async (
  53  |   esClient: Client,
  54  |   streamName: string,
  55  |   condition: Condition
  56  | ): Promise<number> => {
  57  |   const where = buildPartitionWhereClause(condition);
  58  |   const query = `FROM ${streamName} | WHERE ${where} | STATS count = COUNT(*)`;
  59  |   return runEsqlCount(esClient, query);
  60  | };
  61  | 
  62  | const countUnion = async (
  63  |   esClient: Client,
  64  |   streamName: string,
  65  |   partitions: Array<{ condition: Condition }>
  66  | ): Promise<number> => {
  67  |   if (partitions.length === 0) return 0;
  68  | 
  69  |   const whereClauses = partitions.map((p) => `(${buildPartitionWhereClause(p.condition)})`);
  70  |   const query = `FROM ${streamName} | WHERE ${whereClauses.join(' OR ')} | STATS count = COUNT(*)`;
  71  |   return runEsqlCount(esClient, query);
  72  | };
  73  | 
  74  | const countOverlap = async (
  75  |   esClient: Client,
  76  |   streamName: string,
  77  |   partitions: Array<{ condition: Condition }>
  78  | ): Promise<number> => {
  79  |   if (partitions.length < 2) return 0;
  80  | 
  81  |   const pairConditions: string[] = [];
  82  |   for (let i = 0; i < partitions.length; i++) {
  83  |     for (let j = i + 1; j < partitions.length; j++) {
  84  |       const a = `(${buildPartitionWhereClause(partitions[i].condition)})`;
  85  |       const b = `(${buildPartitionWhereClause(partitions[j].condition)})`;
  86  |       pairConditions.push(`(${a} AND ${b})`);
  87  |     }
  88  |   }
  89  | 
  90  |   const query = `FROM ${streamName} | WHERE ${pairConditions.join(
  91  |     ' OR '
  92  |   )} | STATS count = COUNT(*)`;
  93  |   return runEsqlCount(esClient, query);
  94  | };
  95  | 
  96  | const countExclusive = async (
  97  |   esClient: Client,
  98  |   streamName: string,
  99  |   condition: Condition,
  100 |   otherPartitions: Array<{ condition: Condition }>
  101 | ): Promise<number> => {
  102 |   const where = buildPartitionWhereClause(condition);
  103 | 
  104 |   if (otherPartitions.length === 0) {
  105 |     const query = `FROM ${streamName} | WHERE ${where} | STATS count = COUNT(*)`;
  106 |     return runEsqlCount(esClient, query);
  107 |   }
  108 | 
  109 |   const notOthers = otherPartitions
  110 |     .map((p) => `NOT (${buildPartitionWhereClause(p.condition)})`)
  111 |     .join(' AND ');
  112 | 
  113 |   const query = `FROM ${streamName} | WHERE ${where} AND ${notOthers} | STATS count = COUNT(*)`;
  114 |   return runEsqlCount(esClient, query);
  115 | };
  116 | 
  117 | export const calculatePartitioningMetrics = async (
  118 |   esClient: Client,
  119 |   streamName: string,
  120 |   partitions: Array<{ name: string; condition: Condition }>
  121 | ): Promise<PartitioningMetrics> => {
  122 |   const totalDocuments = await countDocuments(esClient, streamName);
  123 | 
  124 |   if (totalDocuments === 0 || partitions.length === 0) {
  125 |     return {
  126 |       totalDocuments,
  127 |       coverage: 0,
  128 |       overlap: 0,
  129 |       perPartitionStats: [],
  130 |       partitionCount: partitions.length,
  131 |     };
  132 |   }
  133 | 
  134 |   const unionCount = await countUnion(esClient, streamName, partitions);
  135 |   const overlapCount = await countOverlap(esClient, streamName, partitions);
  136 | 
  137 |   const coverage = unionCount / totalDocuments;
  138 |   const overlap = unionCount > 0 ? overlapCount / unionCount : 0;
  139 | 
```