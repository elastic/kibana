/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import type { ServiceAccountLookup } from './validate_service_account_reference';
import { validateServiceAccountReference } from './validate_service_account_reference';

const validate = (yaml: string, lookup: ServiceAccountLookup) => {
  const lineCounter = new LineCounter();
  const document = parseDocument(yaml, { lineCounter });
  return validateServiceAccountReference(document, lineCounter, lookup);
};

const workflowYaml = (runAs: string) =>
  ['name: test', 'settings:', `  run_as: ${runAs}`, 'steps: []'].join('\n');

const account = { name: 'Workflow runner', enabled: true, assumable: true };

describe('validateServiceAccountReference', () => {
  it('reports an error when the service account does not exist', async () => {
    const lookup = jest.fn<ReturnType<ServiceAccountLookup>, [string]>(async () => ({
      status: 'not_found',
    }));

    const results = await validate(workflowYaml('missing-sa'), lookup);

    expect(lookup).toHaveBeenCalledWith('missing-sa');
    expect(results).toEqual([
      expect.objectContaining({
        owner: 'service-account-validation',
        ruleId: 'serviceAccountNotFound',
        severity: 'error',
        message: 'Service account "missing-sa" not found. Choose an existing service account.',
        startLineNumber: 3,
        startColumn: 11,
        endLineNumber: 3,
        endColumn: 21,
      }),
    ]);
  });

  it('looks up the raw ID that runtime uses, without trimming', async () => {
    const lookup = jest.fn<ReturnType<ServiceAccountLookup>, [string]>(async () => ({
      status: 'unknown',
    }));

    await validate(workflowYaml('"runner "'), lookup);

    expect(lookup).toHaveBeenCalledWith('runner ');
  });

  it.each([
    ['a stripped literal block', '|-\n    missing-sa', 'missing-sa'],
    ['a literal block, keeping its trailing newline', '|\n    missing-sa', 'missing-sa\n'],
    ['a quoted value that spans lines', '"missing\n    -sa"', 'missing -sa'],
  ])('looks up the parsed ID of %s, as runtime does', async (_, runAs, expectedId) => {
    const lookup = jest.fn<ReturnType<ServiceAccountLookup>, [string]>(async () => ({
      status: 'not_found',
    }));

    const results = await validate(workflowYaml(runAs), lookup);

    expect(lookup).toHaveBeenCalledWith(expectedId);
    expect(results).toEqual([expect.objectContaining({ ruleId: 'serviceAccountNotFound' })]);
  });

  it('reports nothing for an existing, usable service account', async () => {
    const results = await validate(workflowYaml('runner'), async () => ({
      status: 'found',
      account,
    }));

    expect(results).toEqual([]);
  });

  it.each([
    ['disabled', { ...account, enabled: false }],
    ['not assumable', { ...account, assumable: false }],
  ])('reports a warning when the service account is %s', async (_, unusable) => {
    const results = await validate(workflowYaml('runner'), async () => ({
      status: 'found',
      account: unusable,
    }));

    expect(results).toEqual([
      expect.objectContaining({
        ruleId: 'serviceAccountUnavailable',
        severity: 'warning',
      }),
    ]);
  });

  it('reports nothing when the lookup cannot tell', async () => {
    const results = await validate(workflowYaml('runner'), async () => ({ status: 'unknown' }));

    expect(results).toEqual([]);
  });

  it.each([
    ['no settings', ['name: test', 'steps: []'].join('\n')],
    ['an empty run_as', workflowYaml('""')],
    ['a null run_as', workflowYaml('')],
    ['a non-string run_as', workflowYaml('42')],
  ])('skips the lookup for %s', async (_, yaml) => {
    const lookup = jest.fn<ReturnType<ServiceAccountLookup>, [string]>();

    expect(await validate(yaml, lookup)).toEqual([]);
    expect(lookup).not.toHaveBeenCalled();
  });
});
