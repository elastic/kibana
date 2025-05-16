/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GlobalSearchClientConfigType {
  // is a string because the server-side counterpart is a duration
  // which is serialized to string when sent to the client
  // should be parsed using moment.duration(config.search_timeout)
  search_timeout: string;
}
