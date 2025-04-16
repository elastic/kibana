/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A cheap regex to distinguish an HTTP URL string from a data URL string
const httpurlRegex = /^https?:\/\/\S+(?:[0-9]+)?\/\S{1,}/;

export function isValidHttpUrl(str: string): boolean {
  return httpurlRegex.test(str);
}
