/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageTrigger } from '@kbn/workflows';
import {
  getPageForm,
  isPageRequestVerified,
  notFoundPage,
  PAGE_PHISHING_NOTICE,
  PAGE_SUBMITTED_QUERY,
  submitPage,
  validatePageSubmission,
} from './page_submission';
import type { PageSubmissionDeps } from './page_submission';
import type { ResolveWorkflowPageResult } from '../lib/resolve_workflow_page';
import type { WorkflowProperties } from '../storage/workflow_storage';

const request = { workflowId: 'wf-1', pageId: 'default', spaceId: 'default', secret: 'the-secret' };

const trigger = {
  type: 'page',
  id: 'default',
  title: 'Report a bug',
  inputs: {
    type: 'object',
    properties: { summary: { type: 'string', minLength: 3 }, count: { type: 'number' } },
    required: ['summary'],
  },
} as unknown as PageTrigger;

const workflow = {
  name: 'Bug intake',
  enabled: true,
  definition: { triggers: [trigger] },
} as unknown as WorkflowProperties;

const setup = (overrides: Partial<PageSubmissionDeps> = {}) => {
  const deps = {
    arePagesEnabled: jest.fn(async () => true),
    resolveWorkflowPage: jest.fn(async (): Promise<ResolveWorkflowPageResult> => ({ workflow })),
    executeWorkflowAsServiceAccount: jest.fn(async () => ({ workflowExecutionId: 'exec-1' })),
    ...overrides,
  };
  return deps;
};

describe('getPageForm', () => {
  it('renders the form with its title and the phishing notice', async () => {
    const result = await getPageForm(setup(), request);

    expect(result.statusCode).toBe(200);
    expect(result.outcome).toBe('served');
    expect(result.html).toContain('Report a bug');
    expect(result.html).toContain('<form method="POST"');
    expect(result.html).toContain(PAGE_PHISHING_NOTICE);
    // The URL holds the secret, so no request from the page may send it as a referrer.
    expect(result.html).toContain('<meta name="referrer" content="no-referrer" />');
  });

  it('renders the confirmation, not the form, after the redirect from a submit', async () => {
    const result = await getPageForm(setup(), request, { submitted: true });

    expect(result.statusCode).toBe(200);
    expect(result.html).toContain('submission was received');
    expect(result.html).not.toContain('<form');
  });

  it('returns the 404 page when the page does not resolve', async () => {
    const result = await getPageForm(
      setup({ resolveWorkflowPage: jest.fn(async () => ({ reason: 'secret_mismatch' as const })) }),
      request
    );
    expect(result).toEqual(expect.objectContaining({ statusCode: 404, outcome: 'not_found' }));
  });

  it('returns the 404 page without a lookup when the kill switch is off', async () => {
    const deps = setup({ arePagesEnabled: jest.fn(async () => false) });

    await expect(getPageForm(deps, request)).resolves.toEqual(
      expect.objectContaining({ statusCode: 404 })
    );
    expect(deps.resolveWorkflowPage).not.toHaveBeenCalled();
  });
});

describe('submitPage', () => {
  const body = { summary: 'Login fails', count: '2' };

  it('runs the workflow with the values as page.inputs and redirects to the confirmation', async () => {
    const deps = setup();

    const result = await submitPage(deps, request, body);

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 303,
        location: `?${PAGE_SUBMITTED_QUERY}=1`,
        outcome: 'submitted',
        executionId: 'exec-1',
      })
    );
    expect(deps.executeWorkflowAsServiceAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wf-1', name: 'Bug intake' }),
      {
        spaceId: 'default',
        inputs: {},
        page: { inputs: { summary: 'Login fails', count: 2 } },
        triggeredBy: 'page',
        metadata: { pageId: 'default' },
      }
    );
  });

  it.each([
    [
      'the page does not resolve',
      body,
      { resolveWorkflowPage: jest.fn(async () => ({ reason: 'secret_mismatch' as const })) },
    ],
    ['the kill switch is off', body, { arePagesEnabled: jest.fn(async () => false) }],
  ])('returns the 404 page and starts no run when %s', async (_, submitted, overrides) => {
    const deps = setup(overrides);

    const result = await submitPage(deps, request, submitted);

    expect(result).toEqual(expect.objectContaining({ statusCode: 404, outcome: 'not_found' }));
    expect(deps.executeWorkflowAsServiceAccount).not.toHaveBeenCalled();
  });

  it('returns the 404 page with a verified reason when the run fails to start', async () => {
    const error = new Error('mint failed');
    const deps = setup({ executeWorkflowAsServiceAccount: jest.fn().mockRejectedValue(error) });

    const result = await submitPage(deps, request, body);

    expect(result).toEqual(
      expect.objectContaining({ statusCode: 404, outcome: 'error', reason: 'run_failed', error })
    );
    expect(isPageRequestVerified(result)).toBe(true);
  });

  it('returns the form with the errors and the values on invalid input, and starts no run', async () => {
    const deps = setup();

    const result = await submitPage(deps, request, { summary: 'ab' });

    expect(result.statusCode).toBe(400);
    expect(result.outcome).toBe('invalid_input');
    expect(deps.executeWorkflowAsServiceAccount).not.toHaveBeenCalled();
    expect(result.html).toContain('role="alert"');
    expect(result.html).toContain('value="ab"');
  });
});

describe('notFoundPage', () => {
  it('renders the same body for every miss reason', () => {
    const reasons = ['secret_mismatch', 'page_offline', 'pages_disabled', 'run_failed'] as const;
    const bodies = new Set(reasons.map((reason) => notFoundPage(reason).html));
    expect(bodies.size).toBe(1);
  });
});

describe('isPageRequestVerified', () => {
  it.each([
    ['a served form', undefined, true],
    ['a miss after the secret matched', 'workflow_disabled', true],
    ['a real link to an offline page', 'page_offline', true],
    ['a run that failed to start', 'run_failed', true],
    ['a wrong secret', 'secret_mismatch', false],
    ['a missing page', 'page_not_found', false],
    ['the kill switch', 'pages_disabled', false],
    ['an unexpected error', 'unexpected_error', false],
  ] as const)('is %p for %s', (_, reason, verified) => {
    expect(isPageRequestVerified({ reason })).toBe(verified);
  });
});

describe('validatePageSubmission', () => {
  it('keeps the schema error of a field named like an object method', () => {
    const result = validatePageSubmission({ toString: 'ab' }, {
      type: 'object',
      properties: { toString: { type: 'string', minLength: 3 } },
    } as PageTrigger['inputs']);
    expect(result).toEqual({ errors: [expect.stringContaining('toString')] });
  });

  it('returns parse errors and schema errors together', () => {
    const result = validatePageSubmission({ count: 'many' }, trigger.inputs);
    expect(result).toEqual({
      errors: [expect.stringContaining('count'), expect.stringContaining('summary')],
    });
  });

  it('returns errors for each invalid field', () => {
    const result = validatePageSubmission({}, {
      ...trigger.inputs,
      required: ['summary', 'count'],
    } as PageTrigger['inputs']);
    expect('errors' in result && result.errors).toHaveLength(2);
  });
});
