/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { TestEndpointToolCheck } from '../../../../../../../common/types';
import { TestToolCheckResult } from './test_tool_check_result';

const renderResult = (toolCheck: TestEndpointToolCheck) =>
  render(
    <I18nProvider>
      <TestToolCheckResult toolCheck={toolCheck} />
    </I18nProvider>
  );

describe('TestToolCheckResult', () => {
  it('shows the tool call the model made when the check passes', () => {
    renderResult({
      passed: true,
      toolName: 'get_weather',
      arguments: { city: 'Paris' },
      toolResult: 'Sunny',
    });

    expect(screen.getByTestId('testEndpointToolCheckPassed')).toHaveTextContent(
      'The model called the tool.'
    );
    expect(screen.getByTestId('testEndpointToolCheckPassed')).toHaveTextContent(
      'get_weather({"city":"Paris"}) returned "Sunny"'
    );
    expect(screen.queryByTestId('testEndpointToolCheckFailed')).not.toBeInTheDocument();
  });

  it('warns when the model called the tool but the follow-up request failed', () => {
    renderResult({
      passed: true,
      toolName: 'get_weather',
      arguments: { city: 'Paris' },
      toolResult: 'Sunny',
      followUpError: 'tool result rejected',
    });

    expect(screen.getByTestId('testEndpointToolCheckFollowUpFailed')).toHaveTextContent(
      'The model called the tool, but the follow-up request failed.'
    );
    expect(screen.getByTestId('testEndpointToolCheckFollowUpFailed')).toHaveTextContent(
      'tool result rejected'
    );
    expect(screen.queryByTestId('testEndpointToolCheckPassed')).not.toBeInTheDocument();
  });

  it('warns when the model answered without calling the tool', () => {
    renderResult({ passed: false, toolName: 'get_weather' });

    expect(screen.getByTestId('testEndpointToolCheckFailed')).toHaveTextContent(
      'The model answered without calling the tool.'
    );
    expect(screen.queryByTestId('testEndpointToolCheckPassed')).not.toBeInTheDocument();
  });
});
