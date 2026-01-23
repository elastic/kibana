/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { SwimlaneConnectorType } from '../../../common/types/domain';

export const connector = createMockActionConnector({
  id: '123',
  name: 'My connector',
  actionTypeId: '.jira',
});

export const swimlaneConnector = createMockActionConnector({
  id: '123',
  name: 'My connector',
  actionTypeId: '.swimlane',
  config: {
    connectorType: SwimlaneConnectorType.Cases,
    mappings: {
      caseIdConfig: {},
      caseNameConfig: {},
      descriptionConfig: {},
      commentsConfig: {},
    },
  },
});

export const theHiveConnector = createMockActionConnector({
  id: '123',
  name: 'My connector',
  actionTypeId: '.thehive',
  config: {},
});

export const issues = [
  { id: 'personId', title: 'Person Task', key: 'personKey' },
  { id: 'womanId', title: 'Woman Task', key: 'womanKey' },
  { id: 'manId', title: 'Man Task', key: 'manKey' },
  { id: 'cameraId', title: 'Camera Task', key: 'cameraKey' },
  { id: 'tvId', title: 'TV Task', key: 'tvKey' },
];

export const choices = [
  {
    dependent_value: '',
    label: 'Privilege Escalation',
    value: 'Privilege Escalation',
    element: 'category',
  },
  {
    dependent_value: '',
    label: 'Criminal activity/investigation',
    value: 'Criminal activity/investigation',
    element: 'category',
  },
  {
    dependent_value: '',
    label: 'Denial of Service',
    value: 'Denial of Service',
    element: 'category',
  },
  {
    dependent_value: 'Denial of Service',
    label: 'Inbound or outbound',
    value: '12',
    element: 'subcategory',
  },
  {
    dependent_value: 'Denial of Service',
    label: 'Single or distributed (DoS or DDoS)',
    value: '26',
    element: 'subcategory',
  },
  {
    dependent_value: 'Denial of Service',
    label: 'Inbound DDos',
    value: 'inbound_ddos',
    element: 'subcategory',
  },
  {
    dependent_value: '',
    label: 'Software',
    value: 'software',
    element: 'category',
  },
  {
    dependent_value: 'software',
    label: 'Operation System',
    value: 'os',
    element: 'subcategory',
  },
  {
    dependent_value: '',
    label: 'Failed Login',
    value: 'failed_login',
    element: 'category',
  },
  ...['severity', 'urgency', 'impact', 'priority']
    .map((element) => [
      {
        dependent_value: '',
        label: '1 - Critical',
        value: '1',
        element,
      },
      {
        dependent_value: '',
        label: '2 - High',
        value: '2',
        element,
      },
      {
        dependent_value: '',
        label: '3 - Moderate',
        value: '3',
        element,
      },
      {
        dependent_value: '',
        label: '4 - Low',
        value: '4',
        element,
      },
    ])
    .flat(),
];
