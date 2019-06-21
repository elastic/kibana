/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getMlPrefix(serviceName: string, transactionType?: string) {
  const maybeTransactionType = transactionType ? `${transactionType}-` : '';
  return `${serviceName}-${maybeTransactionType}`.toLowerCase();
}

export function getMlJobId(serviceName: string, transactionType?: string) {
  return `${getMlPrefix(serviceName, transactionType)}high_mean_response_time`;
}

export function getMlIndex(serviceName: string, transactionType?: string) {
  return `.ml-anomalies-${getMlJobId(serviceName, transactionType)}`;
}
