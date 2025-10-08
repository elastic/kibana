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

  it('body is not rendered for GET method', async () => {
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
      'This connector is configured to use the GET method.No additional setup is required - a request will automatically be sent to the configured url'
    );
    expect(await screen.queryByTestId('bodyJsonEditor')).not.toBeInTheDocument();
  });

  it('body is not rendered for DELETE method', async () => {
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

    expect(await screen.findByTestId('placeholderCallout')).toHaveTextContent(
      'This connector is configured to use the DELETE method.No additional setup is required - a request will automatically be sent to the configured url'
    );
    expect(await screen.queryByTestId('bodyJsonEditor')).not.toBeInTheDocument();
  });
});
