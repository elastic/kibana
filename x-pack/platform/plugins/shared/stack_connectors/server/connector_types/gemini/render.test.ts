/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { renderParameterTemplates } from './render';
import Mustache from 'mustache';

const params = {
  subAction: 'run',
  subActionParams: {
    body: '{"domain":"{{domain}}"}',
  },
};

const variables = { domain: 'm0zepcuuu2' };
const logger = loggingSystemMock.createLogger();

describe('Gemini - renderParameterTemplates', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('should not render body on test action', () => {
    const testParams = { subAction: 'test', subActionParams: { body: 'test_json' } };
    const result = renderParameterTemplates(logger, testParams, variables);
    expect(result).toEqual(testParams);
  });

  it('should rendered body with variables', () => {
    const result = renderParameterTemplates(logger, params, variables);

    expect(result.subActionParams.body).toEqual(
      JSON.stringify({
        ...variables,
      })
    );
  });

  it('should render error body', () => {
    const errorMessage = 'test error';
    jest.spyOn(Mustache, 'render').mockImplementation(() => {
      throw new Error(errorMessage);
    });
    const result = renderParameterTemplates(logger, params, variables);
    expect(result.subActionParams.body).toEqual(
      'error rendering mustache template "{"domain":"{{domain}}"}": test error'
    );
  });
});
