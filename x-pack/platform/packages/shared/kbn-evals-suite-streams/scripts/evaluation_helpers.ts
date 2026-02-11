/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { flattenObject } from '@kbn/object-utils';
import { get } from 'lodash';

const ES_URL = 'http://localhost:9200';
const ES_USER = 'elastic';
const ES_PASS = 'changeme';
export const KIBANA_URL = 'http://localhost:5601';
export const MESSAGE_FIELD = 'body.text';

const esClient = new Client({
  node: ES_URL,
  auth: {
    username: ES_USER,
    password: ES_PASS,
  },
});

export function getKibanaAuthHeaders() {
  const basic = Buffer.from(`${ES_USER}:${ES_PASS}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'Kibana',
  };
}

/**
 * Parse Server-Sent Events (SSE) stream and return the last event data
 */
export async function parseSSEStream(response: globalThis.Response): Promise<any> {
  const text = await response.text();
  const lines = text.split('\n');
  let lastData = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      try {
        lastData = JSON.parse(data);
      } catch (e) {
        // Skip non-JSON lines
      }
    }
  }

  return lastData;
}

export async function fetchDocs(index: string | string[], size = 100) {
  return await esClient
    .search({
      index,
      size,
      query: { match_all: {} },
      _source: true,
    })
    .then((res) => res.hits.hits.map((h: any) => flattenObject(h._source)));
}

export async function getStreams(): Promise<string[]> {
  const data = await fetch(`${KIBANA_URL}/api/streams`, {
    method: 'GET',
    headers: getKibanaAuthHeaders(),
  }).then(async (res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response (${res.status}): ${await res.text()}`);
  });
  return data.streams.map((s: any) => s.name).filter((name: string) => name.startsWith('logs.'));
}

export async function getConnectors(): Promise<string[]> {
  const data = await fetch(`${KIBANA_URL}/api/actions/connectors`, {
    method: 'GET',
    headers: getKibanaAuthHeaders(),
  }).then(async (res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response (${res.status}): ${await res.text()}`);
  });
  return data.map((c: any) => c.id);
}

export function extractMessages(sampleDocs: any[], messageField: string = MESSAGE_FIELD): string[] {
  return sampleDocs.reduce<string[]>((acc, sample) => {
    const value = get(sample, messageField);
    if (typeof value === 'string') {
      acc.push(value);
    }
    return acc;
  }, []);
}

export async function simulateProcessing(
  stream: string,
  documents: any[],
  steps: any[]
): Promise<any> {
  const data = await fetch(`${KIBANA_URL}/internal/streams/${stream}/processing/_simulate`, {
    method: 'POST',
    headers: getKibanaAuthHeaders(),
    body: JSON.stringify({
      documents,
      processing: {
        steps,
      },
    }),
  }).then(async (res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response (${res.status}): ${await res.text()}`);
  });
  return data;
}

export async function getParsingScore(
  stream: string,
  documents: any[],
  steps: any[],
  batchSize = 1_000
): Promise<number> {
  let parsedDocs = 0;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const simResult = await simulateProcessing(stream, batch, steps);
    simResult.documents.forEach((doc: any) => {
      if (doc.status === 'parsed') {
        parsedDocs++;
      }
    });
  }
  return parsedDocs / documents.length;
}

/**
 * Analyze extracted fields from simulation results
 */
export async function analyzeExtractedFields(
  stream: string,
  documents: any[],
  steps: any[],
  sampleCount = 10,
  batchSize = 1_000
): Promise<Record<string, { uniqueCount: number; samples: string[] }>> {
  const fieldValues: Record<string, Set<string>> = {};

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const simResult = await simulateProcessing(stream, batch, steps);
    const detectedFieldsSet = new Set<string>(simResult.detected_fields.map((f: any) => f.name));
    simResult.documents.forEach((doc: any) => {
      if (doc.status === 'parsed' && doc.value) {
        Object.keys(doc.value).forEach((key) => {
          if (!detectedFieldsSet.has(key)) {
            return;
          }
          if (!fieldValues[key]) {
            fieldValues[key] = new Set();
          }
          const value = doc.value[key];
          if (value !== undefined && value !== null) {
            fieldValues[key].add(String(value));
          }
        });
      }
    });
  }

  return Object.entries(fieldValues).reduce<
    Record<string, { uniqueCount: number; samples: string[] }>
  >((acc, [field, values]) => {
    const valuesArray = Array.from(values);
    acc[field] = {
      uniqueCount: valuesArray.length,
      samples: valuesArray.slice(0, sampleCount).map((v) => {
        const valAsString = String(v);
        if (valAsString.length <= 100) {
          return valAsString;
        }
        return `$${valAsString.slice(0, 100)}...`;
      }),
    };
    return acc;
  }, {});
}
