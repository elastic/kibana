/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { RequestCodeBlock } from './request_code_block';
import { createFormWrapper, defaultTestFormValues } from '../../test_utils';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import * as ruleRequestMappers from '../utils/rule_request_mappers';

describe('RequestCodeBlock', () => {
  const formValues = {
    ...defaultTestFormValues,
    metadata: { name: 'Test rule', enabled: true },
    evaluation: { query: { base: 'FROM logs-* | STATS count = COUNT(*)' } },
  };

  it('renders create request with POST method and correct path', () => {
    render(<RequestCodeBlock activeTab="create" data-test-subj="codeBlock" />, {
      wrapper: createFormWrapper(formValues),
    });

    const codeBlock = screen.getByTestId('codeBlock');
    expect(codeBlock.textContent).toContain(`POST kbn:${ALERTING_V2_RULE_API_PATH}`);
  });

  it('renders update request with PATCH method and rule ID in path', () => {
    render(
      <RequestCodeBlock activeTab="update" ruleId="rule-abc-123" data-test-subj="codeBlock" />,
      { wrapper: createFormWrapper(formValues) }
    );

    const codeBlock = screen.getByTestId('codeBlock');
    expect(codeBlock.textContent).toContain(`PATCH kbn:${ALERTING_V2_RULE_API_PATH}/rule-abc-123`);
  });

  it('renders pretty-printed JSON body for create', () => {
    render(<RequestCodeBlock activeTab="create" data-test-subj="codeBlock" />, {
      wrapper: createFormWrapper(formValues),
    });

    const content = screen.getByTestId('codeBlock').textContent!;
    expect(content).toContain('"kind"');
    expect(content).toContain('"metadata"');
    expect(content).toContain('"schedule"');
    expect(content).toContain('"evaluation"');
  });

  it('renders update body without kind field', () => {
    render(
      <RequestCodeBlock activeTab="update" ruleId="rule-abc-123" data-test-subj="codeBlock" />,
      { wrapper: createFormWrapper(formValues) }
    );

    const content = screen.getByTestId('codeBlock').textContent!;
    expect(content).not.toContain('"kind"');
    expect(content).toContain('"metadata"');
  });

  it('renders copyable code block', () => {
    render(<RequestCodeBlock activeTab="create" data-test-subj="codeBlock" />, {
      wrapper: createFormWrapper(formValues),
    });

    const codeBlock = screen.getByTestId('codeBlock');
    expect(codeBlock).toBeInTheDocument();
  });

  it('renders error message when request serialization fails', () => {
    const createMapperSpy = jest
      .spyOn(ruleRequestMappers, 'mapFormValuesToCreateRequest')
      .mockImplementation(() => {
        throw new Error('serialization error');
      });

    render(<RequestCodeBlock activeTab="create" data-test-subj="codeBlock" />, {
      wrapper: createFormWrapper(formValues),
    });

    const content = screen.getByTestId('codeBlock').textContent!;
    expect(content).toContain('Error serializing rule request');

    createMapperSpy.mockRestore();
  });
});
