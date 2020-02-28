/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import fetch, { HeadersInit } from 'node-fetch';
import path from 'path';
import pLimit from 'p-limit';
import fs from 'fs';

interface Item {
  url: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function insertItem({
  apmServerUrl,
  secretToken,
  item
}: {
  apmServerUrl: string;
  secretToken: string;
  item: Item;
}) {
  try {
    const url = `${apmServerUrl}${item.url}`;
    console.log(Date.now(), url);

    const headers: HeadersInit = {
      'content-type': 'application/x-ndjson'
    };

    if (secretToken) {
      headers.Authorization = `Bearer ${secretToken}`;
    }

    await fetch(url, {
      method: item.method,
      body: JSON.stringify(item.body),
      headers
    });

    // add delay to avoid flooding the queue
    return delay(500);
  } catch (e) {
    console.log('an error occurred');
    if (e.response) {
      console.log(e.response.data);
    } else {
      console.log('error', e);
    }
  }
}

async function parseEventsFile(eventsFilePath: string) {
  const content = await fs.promises.readFile(
    path.resolve(__dirname, eventsFilePath)
  );
  return content
    .toString()
    .split('\n')
    .filter(item => item)
    .map(item => JSON.parse(item))
    .filter(item => item.url === '/intake/v2/events');
}

async function init(
  apmServerUrl: string,
  secretToken: string,
  eventsFilePath: string
) {
  const items = parseEventsFile(eventsFilePath);
  const limit = pLimit(20); // number of concurrent requests
  await Promise.all(
    items.map(item =>
      limit(() => insertItem({ apmServerUrl, secretToken, item }))
    )
  );
}
