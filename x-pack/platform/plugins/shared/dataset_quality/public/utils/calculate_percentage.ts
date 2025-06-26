/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function calculatePercentage({ totalDocs, count }: { totalDocs?: number; count?: number }) {
  return totalDocs && count ? (count / totalDocs) * 100 : 0;
}
