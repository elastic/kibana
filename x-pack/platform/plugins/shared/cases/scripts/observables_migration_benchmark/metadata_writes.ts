/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import { ALERTING_CASES_INDEX } from '../observables_load_test/probe';
import type { Requester } from '../observables_load_test/shared';
import type { LatencyStats } from '../observables_load_test/stats';
import { summarize, timed } from '../observables_load_test/stats';
import { ATTACHMENT_SO_TYPE } from './es_stats';

export interface SampledObservable {
  id: string;
  caseId: string;
  value: string;
  description: string | null;
  version?: string;
}

interface ObservableSource {
  typeMigrationVersion?: string;
  references?: Array<{ type: string; id: string }>;
  'cases-attachments'?: {
    data?: { value?: string; description?: string | null; metadata?: Record<string, string> };
  };
}

export interface MetadataWrites {
  requested: number;
  written: number;
  failed: number;
  failures: string[];
  latency: LatencyStats;
  observables: SampledObservable[];
  metadata: Array<Record<string, string>>;
}

export interface MetadataCheck {
  checked: number;
  kept: number;
  lost: number;
  atVersion: Record<string, number>;
  lostExamples: string[];
}

/** A reproducible random sample of observable attachments, optionally only outdated ones. */
export const sampleObservables = async (
  es: Client,
  size: number,
  { belowVersion, seed = 28997 }: { belowVersion?: string; seed?: number } = {}
): Promise<SampledObservable[]> => {
  const response = await es.search<ObservableSource>({
    index: ALERTING_CASES_INDEX,
    size,
    _source: [
      'typeMigrationVersion',
      'references',
      'cases-attachments.data.value',
      'cases-attachments.data.description',
    ],
    query: {
      function_score: {
        query: {
          bool: {
            filter: [
              { term: { type: ATTACHMENT_SO_TYPE } },
              { term: { 'cases-attachments.type': 'observable' } },
              ...(belowVersion != null
                ? [{ range: { typeMigrationVersion: { lt: belowVersion } } }]
                : []),
            ],
          },
        },
        functions: [{ random_score: { seed, field: '_seq_no' } }],
      },
    },
  });

  return response.hits.hits.flatMap((hit) => {
    const source = hit._source;
    const caseId = source?.references?.find(({ type }) => type === 'cases')?.id;
    const value = source?.['cases-attachments']?.data?.value;
    if (hit._id == null || caseId == null || value == null) {
      return [];
    }
    return [
      {
        id: hit._id.replace(`${ATTACHMENT_SO_TYPE}:`, ''),
        caseId,
        value,
        description: source?.['cases-attachments']?.data?.description ?? null,
        version: source?.typeMigrationVersion,
      },
    ];
  });
};

/** Metadata like an analyst's enrichment: a verdict, a VirusTotal link, a threat intel id. */
export const metadataFor = (
  { value }: SampledObservable,
  index: number
): Record<string, string> => ({
  verdict: index % 2 === 0 ? 'malicious' : 'benign',
  virustotal: `https://www.virustotal.com/gui/search/${encodeURIComponent(value)}`.slice(0, 1_024),
  threatIntelId: `TI-${String(index).padStart(6, '0')}`,
  lastLookedUpAt: new Date().toISOString(),
});

const patchPath = ({ caseId, id }: SampledObservable) =>
  `/internal/cases/${caseId}/observables/${id}`;

/** Sets (or, with `null`, clears) the metadata of each observable in place, one PATCH at a time. */
export const writeMetadata = async (
  request: Requester,
  observables: SampledObservable[],
  metadataOf: (observable: SampledObservable, index: number) => Record<string, string> | null
): Promise<MetadataWrites> => {
  const samples: number[] = [];
  const failures: string[] = [];
  const written: Array<Record<string, string>> = [];
  const succeeded: SampledObservable[] = [];

  for (const [index, observable] of observables.entries()) {
    const metadata = metadataOf(observable, index);
    try {
      const { ms } = await timed(() =>
        request('PATCH', patchPath(observable), {
          observable: { value: observable.value, description: observable.description, metadata },
        })
      );
      samples.push(ms);
      succeeded.push(observable);
      written.push(metadata ?? {});
    } catch (error) {
      if (failures.length < 10) {
        failures.push(`${observable.id}: ${error}`);
      }
    }
  }

  return {
    requested: observables.length,
    written: succeeded.length,
    failed: observables.length - succeeded.length,
    failures,
    latency: summarize(samples),
    observables: succeeded,
    metadata: written,
  };
};

/** Reads the stored documents and checks each still holds the metadata that was written. */
export const checkMetadata = async (
  es: Client,
  observables: SampledObservable[],
  expected: Array<Record<string, string> | null>
): Promise<MetadataCheck> => {
  const check: MetadataCheck = { checked: 0, kept: 0, lost: 0, atVersion: {}, lostExamples: [] };
  if (observables.length === 0) {
    return check;
  }

  const { docs } = await es.mget<ObservableSource>({
    index: ALERTING_CASES_INDEX,
    ids: observables.map(({ id }) => `${ATTACHMENT_SO_TYPE}:${id}`),
    _source: ['typeMigrationVersion', 'cases-attachments.data.metadata'],
  });

  docs.forEach((doc, index) => {
    const source = 'found' in doc && doc.found ? doc._source : undefined;
    check.checked += 1;
    const version = source?.typeMigrationVersion ?? 'missing';
    check.atVersion[version] = (check.atVersion[version] ?? 0) + 1;
    const stored = source?.['cases-attachments']?.data?.metadata ?? null;
    const want = expected[index];
    if (isEqual(stored, want != null && Object.keys(want).length === 0 ? null : want)) {
      check.kept += 1;
    } else {
      check.lost += 1;
      if (check.lostExamples.length < 10) {
        check.lostExamples.push(`${observables[index].id}: ${JSON.stringify(stored)}`);
      }
    }
  });

  return check;
};

/** Checks that observables `_find` returns the metadata of each observable, by value search. */
export const findReturnsMetadata = async (
  request: Requester,
  observables: SampledObservable[],
  expected: Array<Record<string, string>>
): Promise<{ checked: number; returned: number }> => {
  let returned = 0;
  for (const [index, observable] of observables.entries()) {
    const { observables: found } = await request<{
      observables: Array<{ id: string; metadata?: Record<string, string> }>;
    }>('POST', `/internal/cases/${observable.caseId}/observables/_find`, {
      perPage: 100,
      search: observable.value,
    });
    if (isEqual(found.find(({ id }) => id === observable.id)?.metadata, expected[index])) {
      returned += 1;
    }
  }
  return { checked: observables.length, returned };
};
