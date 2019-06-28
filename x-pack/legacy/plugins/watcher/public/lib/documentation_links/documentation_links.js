/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { makeDocumentationLink } from './make_documentation_link';

export const documentationLinks = {
  watcher: {
    putWatchApi: makeDocumentationLink('{baseUrl}guide/en/elasticsearch/reference/{urlVersion}/watcher-api-put-watch.html')
  }
};
