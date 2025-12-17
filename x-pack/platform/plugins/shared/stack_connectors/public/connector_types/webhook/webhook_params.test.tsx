/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

import WebhookParamsFields from './webhook_params';
import type { ActionConnector } from '@kbn/alerts-ui-shared';

describe('WebhookParamsFields renders', () => {
  const actionParams = {
    body: 'test message',
  };

  it('all params fields are rendered when config is missing', async () => {
    renderWithKibanaRenderContext(
      <WebhookParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    const jsonEditor = await screen.findByTestId('bodyJsonEditor');

    expect(jsonEditor).toBeInTheDocument();
    expect(jsonEditor.textContent).toBe('test message');
    expect(await screen.findByTestId('bodyAddVariableButton')).toBeInTheDocument();
  });

  it('all params fields are rendered when method is POST', async () => {
    const actionConnector = {
      config: { method: 'post' },
    } as unknown as ActionConnector;

    renderWithKibanaRenderContext(
      <WebhookParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    const jsonEditor = await screen.findByTestId('bodyJsonEditor');

    expect(jsonEditor).toBeInTheDocument();
    expect(jsonEditor.textContent).toBe('test message');
    expect(await screen.findByTestId('bodyAddVariableButton')).toBeInTheDocument();
  });

  it('all params fields are rendered when method is DELETE', async () => {
    const actionConnector = {
      config: { method: 'delete' },
    } as unknown as ActionConnector;

    renderWithKibanaRenderContext(
      <WebhookParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    const jsonEditor = await screen.findByTestId('bodyJsonEditor');

    expect(jsonEditor).toBeInTheDocument();
    expect(await screen.findByText('Optional')).toBeInTheDocument();
  });

  it('banner displays HTTP method configured', async () => {
    const actionConnector = {
      config: { method: 'get' },
    } as unknown as ActionConnector;

    renderWithKibanaRenderContext(
      <WebhookParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    expect(await screen.findByTestId('placeholderCallout')).toHaveTextContent(
      'This connector is configured to use HTTP GET requests.'
    );
  });
});
