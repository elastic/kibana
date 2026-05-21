/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import WebhookParamsFields from './webhook_params';
import type { CasesWebhookActionConnector } from './types';

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      title: 'sn title',
      description: 'some description',
      tags: ['kibana'],
      externalId: null,
      id: '10006',
      severity: 'High',
      status: 'Open',
    },
    comments: [],
  },
};

const actionConnector = {
  config: {
    createCommentUrl: 'https://elastic.co',
    createCommentJson: {},
  },
} as unknown as CasesWebhookActionConnector;

describe('WebhookParamsFields renders', () => {
  test('all params fields is rendered', () => {
    render(
      <WebhookParamsFields
        actionConnector={actionConnector}
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={jest.fn()}
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
    expect(screen.getByTestId('titleInput')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('tagsComboBox')).toBeInTheDocument();
    const commentsTextArea = screen.getByTestId('commentsTextArea') as HTMLTextAreaElement;
    expect(commentsTextArea).toBeInTheDocument();
    expect(screen.getByTestId('case-severity-selection')).toBeInTheDocument();
    expect(screen.getByTestId('case-status-filter')).toBeInTheDocument();
    expect(commentsTextArea).not.toBeDisabled();
  });

  test('comments field is disabled when comment data is missing', () => {
    const actionConnectorNoComments = {
      config: {},
    } as unknown as CasesWebhookActionConnector;
    render(
      <WebhookParamsFields
        actionConnector={actionConnectorNoComments}
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={jest.fn()}
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
    expect(screen.getByTestId('commentsTextArea')).toBeDisabled();
  });
});
