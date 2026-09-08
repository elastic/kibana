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
export async function parseSSEStream(response: globalThis.Response): Promise<unknown> {
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
    .then((res) =>
      res.hits.hits.map(
        (h) =>
          flattenObject((h._source ?? {}) as Record<string, unknown>) as Record<string, unknown>
      )
    );
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
  return (
    (data as { streams?: Array<{ name: string }> }).streams
      ?.map((s) => s.name)
      .filter((name: string) => name.startsWith('logs.')) ?? []
  );
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
  return Array.isArray(data) ? (data as Array<{ id: string }>).map((c) => c.id) : [];
}

export function extractMessages(
  sampleDocs: Array<Record<string, unknown>>,
  messageField: string = MESSAGE_FIELD
): string[] {
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
  documents: Array<Record<string, unknown>>,
  steps: Array<Record<string, unknown>>
): Promise<Record<string, unknown>> {
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
  documents: Array<Record<string, unknown>>,
  steps: Array<Record<string, unknown>>,
  batchSize = 1_000
): Promise<number> {
  let parsedDocs = 0;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const simResult = (await simulateProcessing(stream, batch, steps)) as {
      documents: Array<{ status?: string }>;
    };
    simResult.documents.forEach((doc) => {
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
  documents: Array<Record<string, unknown>>,
  steps: Array<Record<string, unknown>>,
  sampleCount = 10,
  batchSize = 1_000
): Promise<Record<string, { uniqueCount: number; samples: string[] }>> {
  const fieldValues: Record<string, Set<string>> = {};

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const simResult = (await simulateProcessing(stream, batch, steps)) as {
      detected_fields: Array<{ name: string }>;
      documents: Array<{ status?: string; value?: Record<string, unknown> }>;
    };
    const detectedFieldsSet = new Set<string>(simResult.detected_fields.map((f) => f.name));
    simResult.documents.forEach((doc) => {
      const docValue = doc.value;
      if (doc.status === 'parsed' && docValue) {
        Object.keys(docValue).forEach((key) => {
          if (!detectedFieldsSet.has(key)) {
            return;
          }
          if (!fieldValues[key]) {
            fieldValues[key] = new Set();
          }
          const value = docValue[key];
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
