/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleCategorizationValidation } from './validate';
import type { CategorizationState } from '../../types';
import { categorizationTestState } from '../../../__jest__/fixtures/categorization';

const state: CategorizationState = categorizationTestState;

describe('Testing categorization invalid category', () => {
  it('handleCategorizationValidation()', async () => {
    state.pipelineResults = [{ test: 'testresult', event: { category: ['foo'] } }];
    const response = handleCategorizationValidation({ state });
    expect(response.invalidCategorization).toEqual([
      {
        error:
          "field event.category's values (foo) is not one of the allowed values (api, authentication, configuration, database, driver, email, file, host, iam, intrusion_detection, library, malware, network, package, process, registry, session, threat, vulnerability, web)",
      },
    ]);
    expect(response.lastExecutedChain).toBe('handleCategorizationValidation');
  });
});

describe('Testing categorization invalid type', () => {
  it('handleCategorizationValidation()', async () => {
    state.pipelineResults = [{ test: 'testresult', event: { type: ['foo'] } }];
    const response = handleCategorizationValidation({ state });
    expect(response.invalidCategorization).toEqual([
      {
        error:
          "field event.type's values (foo) is not one of the allowed values (access, admin, allowed, change, connection, creation, deletion, denied, end, error, group, indicator, info, installation, protocol, start, user)",
      },
    ]);
    expect(response.lastExecutedChain).toBe('handleCategorizationValidation');
  });
});

describe('Testing categorization invalid compatibility', () => {
  it('handleCategorizationValidation()', async () => {
    state.pipelineResults = [
      { test: 'testresult', event: { category: ['authentication'], type: ['access'] } },
    ];
    const response = handleCategorizationValidation({ state });
    expect(response.invalidCategorization).toEqual([
      {
        error: 'event.type (access) not compatible with any of the event.category (authentication)',
      },
    ]);
    expect(response.lastExecutedChain).toBe('handleCategorizationValidation');
  });
});
