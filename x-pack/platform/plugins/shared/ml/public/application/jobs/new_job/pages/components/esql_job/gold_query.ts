/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GOLD_ESQL_DATAFEED_QUERY = `FROM logs-*
| STATS doc_count = COUNT(*), avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 hour)`;
