/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { renderParameterTemplates } from './render';
import { SUB_ACTION } from '../../../common/xsoar/constants';
import Mustache from 'mustache';

const params = {
  subAction: SUB_ACTION.RUN,
  subActionParams: {
    name: 'new incident - {{alert.uuid}}',
    playbookId: 'playbook0',
    createInvestigation: true,
    severity: 0,
    isRuleSeverity: true,
    body: '',
  },
};

const variables = {
  url: 'https://example.com',
  context: { rule: { severity: 'medium' } },
  alert: { uuid: 'test123' },
};
const logger = loggingSystemMock.createLogger();

describe('XSOAR - renderParameterTemplates', () => {
  it('should rendered subActionParams with variables', () => {
    const result = renderParameterTemplates(logger, params, variables);

    expect(result.subActionParams).toEqual({
      name: `new incident - ${variables.alert.uuid}`,
      playbookId: 'playbook0',
      createInvestigation: true,
      severity: 2,
      isRuleSeverity: true,
      body: '',
    });
  });

  it('should not use rule severity if isRuleSeverity is false', () => {
    const paramswithoutRuleSeverity = {
      ...params,
      subActionParams: { ...params.subActionParams, isRuleSeverity: false },
    };
    const result = renderParameterTemplates(logger, paramswithoutRuleSeverity, variables);

    expect(result.subActionParams).toEqual({
      name: `new incident - ${variables.alert.uuid}`,
      playbookId: 'playbook0',
      createInvestigation: true,
      severity: 0,
      isRuleSeverity: false,
      body: '',
    });
  });

  it('should render error body', () => {
    const errorMessage = 'test error';
    jest.spyOn(Mustache, 'render').mockImplementation(() => {
      throw new Error(errorMessage);
    });
    const result = renderParameterTemplates(logger, params, variables);
    expect(result.subActionParams).toEqual({
      body: 'error rendering mustache template "": test error',
      createInvestigation: true,
      name: 'error rendering mustache template "new incident - {{alert.uuid}}": test error',
      playbookId: 'error rendering mustache template "playbook0": test error',
      severity: 0,
      isRuleSeverity: true,
    });
  });
});
