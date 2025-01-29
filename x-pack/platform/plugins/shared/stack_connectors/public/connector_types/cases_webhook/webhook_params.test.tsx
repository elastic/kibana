/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import WebhookParamsFields from './webhook_params';
import { CasesWebhookActionConnector } from './types';

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
    const wrapper = mountWithIntl(
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
    expect(wrapper.find('[data-test-subj="titleInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="case-severity-selection"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="case-status-filter"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').first().prop('disabled')).toEqual(
      false
    );
  });
  test('comments field is disabled when comment data is missing', () => {
    const actionConnectorNoComments = {
      config: {},
    } as unknown as CasesWebhookActionConnector;
    const wrapper = mountWithIntl(
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
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').first().prop('disabled')).toEqual(
      true
    );
  });
});
