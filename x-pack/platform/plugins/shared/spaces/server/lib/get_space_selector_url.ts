/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getSpaceSelectorUrl(serverBasePath: string, next?: string) {
  const url = `${serverBasePath}/spaces/space_selector`;
  return next ? `${url}?next=${encodeURIComponent(next)}` : url;
}
