/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { renderParameterTemplates } from './render';
import { SUB_ACTION } from '../../../common/thehive/constants';
import Mustache from 'mustache';

const params = {
  subAction: SUB_ACTION.CREATE_ALERT,
  subActionParams: {
    title: 'title',
    description: 'description',
    type: 'type',
    source: 'source',
    sourceRef: '{{alert.uuid}}',
    tlp: 2,
    severity: 1,
    isRuleSeverity: true,
    body: '{"observables":[{"datatype":"url","data":"{{url}}"}],"tags":["test"]}',
  },
};

const variables = {
  url: 'https://example.com',
  context: { rule: { severity: 'high' } },
  alert: { uuid: 'test123' },
};
const logger = loggingSystemMock.createLogger();

describe('TheHive - renderParameterTemplates', () => {
  it('should rendered subActionParams with variables', () => {
    const result = renderParameterTemplates(logger, params, variables);

    expect(result.subActionParams).toEqual({
      title: 'title',
      description: 'description',
      type: 'type',
      source: 'source',
      sourceRef: variables.alert.uuid,
      tlp: 2,
      severity: 3,
      isRuleSeverity: true,
      body: `{"observables":[{"datatype":"url","data":"${variables.url}"}],"tags":["test"]}`,
    });
  });

  it('should not use rule severity if isRuleSeverity is false', () => {
    const paramswithoutRuleSeverity = {
      ...params,
      subActionParams: { ...params.subActionParams, isRuleSeverity: false },
    };
    const result = renderParameterTemplates(logger, paramswithoutRuleSeverity, variables);

    expect(result.subActionParams).toEqual({
      title: 'title',
      description: 'description',
      type: 'type',
      source: 'source',
      sourceRef: variables.alert.uuid,
      tlp: 2,
      severity: 1,
      isRuleSeverity: false,
      body: `{"observables":[{"datatype":"url","data":"${variables.url}"}],"tags":["test"]}`,
    });
  });

  it('should render error body', () => {
    const errorMessage = 'test error';
    jest.spyOn(Mustache, 'render').mockImplementation(() => {
      throw new Error(errorMessage);
    });
    const result = renderParameterTemplates(logger, params, variables);
    expect(result.subActionParams).toEqual({
      body: 'error rendering mustache template "{"observables":[{"datatype":"url","data":"{{url}}"}],"tags":["test"]}": test error',
      description: 'error rendering mustache template "description": test error',
      severity: 2,
      isRuleSeverity: true,
      source: 'error rendering mustache template "source": test error',
      sourceRef: 'error rendering mustache template "{{alert.uuid}}": test error',
      title: 'error rendering mustache template "title": test error',
      tlp: 2,
      type: 'error rendering mustache template "type": test error',
    });
  });
});
