/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let docLinks: Record<string, string> = {};

export const setDocLinks = (links: Record<string, string>) => {
  docLinks = links;
};

export const getDocLinks = () => docLinks;
