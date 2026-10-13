/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedResourceWithSampling } from '../utils/resources';
import type { Action } from './actions';
import type { EsqlLoadedDocumentation } from './documentation';
import { EsqlDocEntry } from './documentation';
import {
  createGenerateEsqlPrompt,
  createRequestDocumentationPrompt,
  createRequestDocumentationPromptNoResource,
} from './prompts';

const TS_DOC_CONTENT = 'ts queries documentation';
const PROMQL_DOC_CONTENT = 'promql queries documentation';

const documentation: EsqlLoadedDocumentation = {
  getDocContent: (entry) => {
    switch (entry) {
      case EsqlDocEntry.tsQueries:
        return TS_DOC_CONTENT;
      case EsqlDocEntry.promqlQueries:
        return PROMQL_DOC_CONTENT;
      default:
        return '';
    }
  },
};

const resource: ResolvedResourceWithSampling = {
  name: 'metrics-test',
  type: 'index' as ResolvedResourceWithSampling['type'],
  fields: [],
  isTsdb: false,
};

const getSystemPrompt = ({ requestedKeywords }: { requestedKeywords: string[] }): string => {
  const previousActions: Action[] = [
    { type: 'request_documentation', requestedKeywords, fetchedDoc: {} },
  ];
  const [[, systemPrompt]] = createGenerateEsqlPrompt({
    nlQuery: 'request rate per instance',
    resource,
    documentation,
    previousActions,
  }) as Array<[string, string]>;
  return systemPrompt;
};

describe('createGenerateEsqlPrompt', () => {
  it('includes only the TS documentation when TS is requested', () => {
    const systemPrompt = getSystemPrompt({ requestedKeywords: ['TS'] });

    expect(systemPrompt).toContain(TS_DOC_CONTENT);
    expect(systemPrompt).not.toContain(PROMQL_DOC_CONTENT);
  });

  it('includes only the PROMQL documentation when PROMQL is requested', () => {
    const systemPrompt = getSystemPrompt({ requestedKeywords: ['PROMQL'] });

    expect(systemPrompt).toContain(PROMQL_DOC_CONTENT);
    expect(systemPrompt).not.toContain(TS_DOC_CONTENT);
  });

  it('does not include the time series documentation for other keywords', () => {
    const systemPrompt = getSystemPrompt({ requestedKeywords: ['STATS'] });

    expect(systemPrompt).not.toContain(TS_DOC_CONTENT);
    expect(systemPrompt).not.toContain(PROMQL_DOC_CONTENT);
  });
});

describe('request documentation prompts', () => {
  const getUserPrompt = (messages: unknown): string =>
    (messages as Array<[string, string]>).find(([role]) => role === 'user')?.[1] ?? '';

  it.each([
    ['with resource', createRequestDocumentationPrompt],
    ['without resource', createRequestDocumentationPromptNoResource],
  ])('includes the additional context (%s)', (_, createPrompt) => {
    const userPrompt = getUserPrompt(
      createPrompt({
        nlQuery: 'cpu utilization',
        resource,
        documentation,
        additionalContext: 'You MUST use the PROMQL command',
      })
    );

    expect(userPrompt).toContain(
      '<additional-context>\nYou MUST use the PROMQL command\n</additional-context>'
    );
  });
});
