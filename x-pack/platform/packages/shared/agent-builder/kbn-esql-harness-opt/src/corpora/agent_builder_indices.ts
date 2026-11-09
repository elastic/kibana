/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexRequest, IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { createRandom } from './random';

/**
 * Indices behind the three analytical examples copied from the agent-builder ES|QL suite. That
 * suite runs against a pre-loaded demo dataset; here the same questions need a local target, so
 * the indices are recreated with just the fields the questions touch.
 */
export const agentBuilderFixtureIndices: IndicesCreateRequest[] = [
  {
    index: 'users',
    mappings: {
      properties: {
        id: { type: 'keyword' },
        email: { type: 'keyword' },
        name: { type: 'keyword' },
        created_at: { type: 'date' },
      },
    },
  },
  {
    index: 'projects',
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        owner_id: { type: 'keyword' },
        created_at: { type: 'date' },
        deleted_at: { type: 'date' },
      },
    },
  },
  {
    index: 'error_rate_daily',
    mappings: {
      properties: {
        project_id: { type: 'keyword' },
        date: { type: 'date' },
        error_count: { type: 'long' },
      },
    },
  },
];

const EMAIL_DOMAINS = ['gray-smith.com', 'example.org', 'acme-corp.io', 'north-wind.dev'];
const FIRST_NAMES = ['tina', 'amir', 'lena', 'pavel', 'rosa', 'ken', 'ida', 'omar'];
const LAST_NAMES = ['jackson', 'nowak', 'ferreira', 'tanaka', 'okafor', 'dubois'];

const buildUsers = (): IndexRequest[] => {
  const random = createRandom('users');
  const documents: IndexRequest[] = [
    {
      index: 'users',
      id: 'user-tina',
      document: {
        id: 'user-tina',
        email: 'tina.jackson@gray-smith.com',
        name: 'Tina Jackson',
        created_at: '2024-03-17T09:12:00.000Z',
      },
    },
  ];

  for (let i = 0; i < 60; i++) {
    const first = FIRST_NAMES[random.int(FIRST_NAMES.length)];
    const last = LAST_NAMES[random.int(LAST_NAMES.length)];
    const domain = EMAIL_DOMAINS[random.int(EMAIL_DOMAINS.length)];
    documents.push({
      index: 'users',
      id: `user-${i}`,
      document: {
        id: `user-${i}`,
        email: `${first}.${last}${i}@${domain}`,
        name: `${first} ${last}`,
        created_at: new Date(Date.UTC(2023, random.int(12), 1 + random.int(28))).toISOString(),
      },
    });
  }

  return documents;
};

const buildProjects = (): IndexRequest[] => {
  const random = createRandom('projects');
  return Array.from({ length: 40 }, (unused, i) => {
    const deleted = random.float() < 0.4;
    return {
      index: 'projects',
      id: `project-${i}`,
      document: {
        id: `project-${i}`,
        name: `project-${i}`,
        owner_id: `user-${random.int(60)}`,
        created_at: new Date(Date.UTC(2023, random.int(12), 1 + random.int(28))).toISOString(),
        ...(deleted
          ? {
              deleted_at: new Date(
                Date.UTC(2024, random.int(10), 1 + random.int(28), random.int(24))
              ).toISOString(),
            }
          : {}),
      },
    };
  });
};

const buildErrorRates = (): IndexRequest[] => {
  const random = createRandom('error_rate_daily');
  const documents: IndexRequest[] = [];
  for (let projectIndex = 0; projectIndex < 8; projectIndex++) {
    const base = 5 + projectIndex * 7;
    for (let day = 0; day < 40; day++) {
      const date = new Date(Date.UTC(2024, 4, 15 + day));
      documents.push({
        index: 'error_rate_daily',
        id: `error-${projectIndex}-${day}`,
        document: {
          project_id: `project-${projectIndex}`,
          date: date.toISOString().slice(0, 10),
          error_count: Math.round(base + random.float() * 10),
        },
      });
    }
  }
  return documents;
};

export const agentBuilderFixtureDocuments: IndexRequest[] = [
  ...buildUsers(),
  ...buildProjects(),
  ...buildErrorRates(),
];
