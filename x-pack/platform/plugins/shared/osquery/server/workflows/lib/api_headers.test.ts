/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  OSQUERY_MAX_AGENTS_HEADER,
  OSQUERY_DISPATCH_SOURCE_HEADER,
  OSQUERY_DISPATCH_WORKFLOW_ID_HEADER,
  OSQUERY_DISPATCH_EXECUTION_ID_HEADER,
} from '../../../common/constants';
import { TARGET_AGENT_LIMIT } from '../../../common/workflows/contract/budget';
import { getDispatchApiHeaders, PUBLIC_API_HEADERS, INTERNAL_API_HEADERS } from './api_headers';

describe('getDispatchApiHeaders', () => {
  it('sends the agent ceiling and workflow source and trace IDs without stripped header names', () => {
    const headers = getDispatchApiHeaders({ workflowId: 'wf-1', executionId: 'exec-1' });

    expect(headers).toEqual({
      'elastic-api-version': API_VERSIONS.public.v1,
      [OSQUERY_MAX_AGENTS_HEADER]: String(TARGET_AGENT_LIMIT),
      [OSQUERY_DISPATCH_SOURCE_HEADER]: 'workflow',
      [OSQUERY_DISPATCH_WORKFLOW_ID_HEADER]: 'wf-1',
      [OSQUERY_DISPATCH_EXECUTION_ID_HEADER]: 'exec-1',
    });
    // `callKibanaApi` drops caller-supplied `x-elastic-internal-*` headers.
    expect(Object.keys(headers).some((header) => header.startsWith('x-elastic-internal-'))).toBe(
      false
    );
    expect(getDispatchApiHeaders({ workflowId: 'wf-2', executionId: 'exec-2' })).toMatchObject({
      [OSQUERY_DISPATCH_WORKFLOW_ID_HEADER]: 'wf-2',
      [OSQUERY_DISPATCH_EXECUTION_ID_HEADER]: 'exec-2',
    });
  });

  it('keeps workflow dispatch metadata out of non-dispatch headers', () => {
    expect(PUBLIC_API_HEADERS).toEqual({ 'elastic-api-version': API_VERSIONS.public.v1 });
    expect(INTERNAL_API_HEADERS).toEqual({ 'elastic-api-version': API_VERSIONS.internal.v1 });
  });
});
