/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import axios from 'axios';
import path from 'path';
import pLimit from 'p-limit';
import fs from 'fs';

interface Item {
  url: string;
  method: string;
  body: unknown;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    const headers: HeadersInit = {
      'content-type': 'application/x-ndjson'
    };

    if (secretToken) {
      headers.Authorization = `Bearer ${secretToken}`;
    }

    await axios({
      method: item.method as 'GET',
      url,
      headers,
      data: item.body
    });

    console.log(`✅ ${item.method} ${url}`);

    // add delay to avoid flooding the queue
    return delay(500);
  } catch (e) {
    console.log(`❌ ${e.response ? e.response.data : e.message}`);
  }
}

async function parseEventsFile(eventsFilePath: string): Promise<Item[]> {
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

export async function ingestMockData({
  apmServerUrl,
  secretToken,
  eventsFilePath
}: {
  apmServerUrl: string;
  secretToken: string;
  eventsFilePath: string;
}) {
  const items = await parseEventsFile(eventsFilePath);
  const limit = pLimit(20); // number of concurrent requests

  await Promise.all(
    items
      .slice(0, 100)
      .map(item => limit(() => insertItem({ apmServerUrl, secretToken, item })))
  );
}
