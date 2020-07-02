/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-expect-error
import fetch from 'node-fetch';
import uuid from 'uuid';
import { KibanaRequest, KibanaResponseFactory } from '../../../../../src/core/server';
import { DataEnhancedStart } from '../../../../plugins/data_enhanced/server';

export interface DemoBody {
  sessionId: string;
  wordCount: number;
}

const demoWords: Map<string, string[]> = new Map();

const snooze = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const getUUID = uuid;
const getData = async (wordCount: number) => {
  await snooze(1000);
  const result = await fetch(`https://random-word-api.herokuapp.com/word?number=${wordCount}`);
  return await result.json();
};

export async function backgroundSessionRouteHandler(
  sessionService: DataEnhancedStart['sessionService'],
  request: KibanaRequest<unknown, unknown, DemoBody>,
  response: KibanaResponseFactory
) {
  const storedId = await sessionService.getId(request, request.body.sessionId, {
    wordCount: request.body.wordCount,
  });
  let wordsArray: string[] | undefined;
  if (storedId) {
    wordsArray = demoWords.get(storedId);
  } else {
    const internalId = getUUID();
    wordsArray = await getData(request.body.wordCount);
    demoWords.set(internalId, wordsArray!);
    sessionService.trackId(request, request.body.sessionId, request.body, internalId);
  }

  return response.ok({
    body: {
      restored: !!storedId,
      wordsArray,
    },
  });
}
