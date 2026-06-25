/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function spacePrefix(spaceId: string): string {
  return spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
}

export function spaceUrl(url: string, spaceId: string): string {
  return `${spacePrefix(spaceId)}${url}`;
}
