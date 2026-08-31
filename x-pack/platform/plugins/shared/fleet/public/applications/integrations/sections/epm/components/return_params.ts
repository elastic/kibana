/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ReturnParams {
  returnAppId: string;
  returnPath: string;
}

export function readReturnParams(search: string): ReturnParams | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const returnAppId = params.get('returnAppId');
  const returnPath = params.get('returnPath');
  if (!returnAppId || !returnPath) {
    return undefined;
  }
  return { returnAppId, returnPath };
}

export function appendReturnParams(path: string, returnParams?: ReturnParams): string {
  if (!returnParams || !returnParams.returnAppId || !returnParams.returnPath) {
    return path;
  }
  const question = path.indexOf('?');
  const base = question === -1 ? path : path.slice(0, question);
  const query = question === -1 ? '' : path.slice(question + 1);
  const params = new URLSearchParams(query);
  params.set('returnAppId', returnParams.returnAppId);
  params.set('returnPath', returnParams.returnPath);
  return `${base}?${params.toString()}`;
}
