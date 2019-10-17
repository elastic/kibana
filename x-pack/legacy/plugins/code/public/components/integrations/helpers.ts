/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO(rylnd): make this an actual external link
export const externalFileURI: (repoUri: string, filePath: string) => string = (uri, path) =>
  `/${uri}/blob/HEAD/${path}`;
