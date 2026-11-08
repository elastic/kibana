/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The name of the thing itself. Models tend to fold its type, a state or an endpoint into the
 * name ("k8s deployment: shipping (0/0)", "quote-old:8080 (NXDOMAIN)"); those belong to the type
 * and the events, so a leading "type:" and trailing "(...)" or ":port" are dropped.
 */
export const toEntityName = (raw: string): string => {
  const name = raw
    .replace(/^[A-Za-z0-9_ -]{2,40}:\s+(?=\S)/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/:\d{2,5}$/, '')
    .trim();
  return name || raw.trim();
};
