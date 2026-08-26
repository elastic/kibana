/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import type { ResolvedResourceWithSampling } from '../utils/resources';
import type { MappingFieldWithStats } from '../utils/sampling';
import type { EsqlLoadedDocumentation } from './documentation';
import type { EsqlDocEntry } from './documentation';
import { createGenerateEsqlPrompt } from './prompts';
import type { Action, RequestDocumentationAction } from './actions';

// Fixed, distinguishable content per doc entry so we can tell which sections got included.
const documentation: EsqlLoadedDocumentation = {
  getDocContent: (entry: EsqlDocEntry) => `<<${entry}-content>>`,
};

const field = (overrides: Partial<MappingFieldWithStats>): MappingFieldWithStats => ({
  path: 'message',
  type: 'keyword',
  meta: {},
  searchable: true,
  stats: { filledDocCount: 0, emptyDocCount: 0, values: [] },
  ...overrides,
});

const buildResource = ({
  name,
  isTsdb,
  fields,
}: {
  name: string;
  isTsdb: boolean;
  fields: MappingFieldWithStats[];
}): ResolvedResourceWithSampling => ({
  name,
  type: EsResourceType.index,
  fields,
  isTsdb,
});

const requestDocAction = (requestedKeywords: string[]): RequestDocumentationAction => ({
  type: 'request_documentation',
  requestedKeywords,
  fetchedDoc: {},
});

// System message text as authored is `['system', <string>]`; user message is `['user', <string>]`.
const getSystemText = (messages: ReturnType<typeof createGenerateEsqlPrompt>): string =>
  (messages[0] as [string, string])[1];
const getUserText = (messages: ReturnType<typeof createGenerateEsqlPrompt>): string =>
  (messages[1] as [string, string])[1];

const RESOURCES: Array<{ name: string; isTsdb: boolean; fields: MappingFieldWithStats[] }> = [
  { name: 'logs-a', isTsdb: false, fields: [field({ path: 'message', type: 'text' })] },
  {
    name: 'metrics-b',
    isTsdb: true,
    fields: [
      field({ path: 'host.name', type: 'keyword', tsDimension: true }),
      field({ path: 'system.cpu.pct', type: 'float', tsMetric: 'gauge' }),
    ],
  },
];

const NL_QUERIES = ['find errors in the last hour', 'count events by host.name'];
const ROW_LIMITS: Array<number | undefined> = [undefined, 100, 50];
const DISABLE_NAMED_PARAMS: Array<boolean | undefined> = [undefined, false, true];
const ADDITIONAL_INSTRUCTIONS: Array<string | undefined> = [
  undefined,
  'Always use COALESCE for null handling',
  'Prefer CASE over COALESCE',
];
const PREVIOUS_ACTIONS_SCENARIOS: Action[][] = [
  [],
  [requestDocAction(['STATS'])],
  [requestDocAction(['TS'])],
  [requestDocAction(['TS', 'STATS'])],
  [
    requestDocAction(['STATS']),
    { type: 'generate_query', success: false, response: 'no query here' },
  ],
];

interface MatrixCase {
  nlQuery: string;
  resource: ResolvedResourceWithSampling;
  rowLimit: number | undefined;
  disableNamedParams: boolean | undefined;
  additionalInstructions: string | undefined;
  previousActions: Action[];
}

const buildMatrix = (): MatrixCase[] => {
  const cases: MatrixCase[] = [];
  for (const nlQuery of NL_QUERIES) {
    for (const resourceDef of RESOURCES) {
      for (const rowLimit of ROW_LIMITS) {
        for (const disableNamedParams of DISABLE_NAMED_PARAMS) {
          for (const additionalInstructions of ADDITIONAL_INSTRUCTIONS) {
            for (const previousActions of PREVIOUS_ACTIONS_SCENARIOS) {
              cases.push({
                nlQuery,
                resource: buildResource(resourceDef),
                rowLimit,
                disableNamedParams,
                additionalInstructions,
                previousActions,
              });
            }
          }
        }
      }
    }
  }
  return cases;
};

const tsDocRequestedFor = (previousActions: Action[]): boolean =>
  previousActions.some(
    (a) => a.type === 'request_documentation' && a.requestedKeywords.includes('TS')
  );

describe('createGenerateEsqlPrompt', () => {
  const matrix = buildMatrix();

  it('has a non-trivial matrix to exercise (sanity check on the test itself)', () => {
    expect(matrix.length).toBeGreaterThan(100);
  });

  describe('system prompt determinism', () => {
    it('collapses to exactly two distinct strings across the whole matrix', () => {
      const systemTexts = new Set(
        matrix.map((testCase) =>
          getSystemText(createGenerateEsqlPrompt({ ...testCase, documentation }))
        )
      );
      expect(systemTexts.size).toBe(2);
    });

    it('selects the variant by `resource.isTsdb || tsDocRequested` and nothing else', () => {
      const canonicalByVariant = new Map<boolean, string>();

      for (const testCase of matrix) {
        const isTsdbVariant =
          testCase.resource.isTsdb || tsDocRequestedFor(testCase.previousActions);
        const systemText = getSystemText(createGenerateEsqlPrompt({ ...testCase, documentation }));

        const canonical = canonicalByVariant.get(isTsdbVariant);
        if (canonical === undefined) {
          canonicalByVariant.set(isTsdbVariant, systemText);
        } else {
          // Every other varying input (nlQuery, resource name/fields beyond isTsdb,
          // rowLimit, disableNamedParams, additionalInstructions, non-TS previous actions)
          // must have zero effect on the system prompt once the TSDB variant is fixed.
          expect(systemText).toBe(canonical);
        }
      }

      expect(canonicalByVariant.size).toBe(2);
      expect(canonicalByVariant.get(true)).toContain('<tsds-documentation>');
      expect(canonicalByVariant.get(false)).not.toContain('<tsds-documentation>');
    });

    it('never contains additionalInstructions in the system prompt (relocated to user message)', () => {
      for (const testCase of matrix) {
        if (!testCase.additionalInstructions) continue;
        const systemText = getSystemText(createGenerateEsqlPrompt({ ...testCase, documentation }));
        expect(systemText).not.toContain(testCase.additionalInstructions);
        expect(systemText).not.toContain('<user-instructions>');
      }
    });

    it('is stable across two calls with different additionalInstructions (cross-invocation cache case)', () => {
      const base = {
        nlQuery: 'find errors',
        resource: buildResource(RESOURCES[0]),
        documentation,
        rowLimit: undefined,
        disableNamedParams: undefined,
        previousActions: [],
      };
      const first = createGenerateEsqlPrompt({ ...base, additionalInstructions: 'Use COALESCE' });
      const second = createGenerateEsqlPrompt({
        ...base,
        additionalInstructions: 'Never use COALESCE, prefer CASE',
      });
      expect(getSystemText(first)).toBe(getSystemText(second));
    });
  });

  describe('named-params section placement', () => {
    it('appears in the user message iff !disableNamedParams', () => {
      for (const testCase of matrix) {
        const userText = getUserText(createGenerateEsqlPrompt({ ...testCase, documentation }));
        const hasNamedParamsSection = userText.includes(
          'Using named parameters for start and end time periods'
        );
        expect(hasNamedParamsSection).toBe(!testCase.disableNamedParams);
      }
    });

    it('never appears in the system message regardless of disableNamedParams', () => {
      for (const testCase of matrix) {
        const systemText = getSystemText(createGenerateEsqlPrompt({ ...testCase, documentation }));
        expect(systemText).not.toContain('Using named parameters for start and end time periods');
      }
    });
  });

  describe('row limit override placement', () => {
    it('includes a LIMIT override line in the user message only when rowLimit differs from the default', () => {
      const base = {
        nlQuery: 'find errors',
        resource: buildResource(RESOURCES[0]),
        documentation,
        disableNamedParams: undefined,
        additionalInstructions: undefined,
        previousActions: [],
      };

      const withDefault = getUserText(createGenerateEsqlPrompt({ ...base, rowLimit: 100 }));
      const withUndefined = getUserText(createGenerateEsqlPrompt({ ...base, rowLimit: undefined }));
      const withOverride = getUserText(createGenerateEsqlPrompt({ ...base, rowLimit: 50 }));

      expect(withDefault).not.toContain('LIMIT 50');
      expect(withUndefined).not.toMatch(/instead of the default/);
      expect(withOverride).toContain('LIMIT 50');
      expect(withOverride).toContain('instead of the default');
    });
  });
});
