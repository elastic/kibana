/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpRequestConfig } from '.';

export const TEMPLATES: Record<
  string,
  { name: string; serviceId: string; templateValues: HttpRequestConfig }
> = {
  'jira-create-incident': {
    serviceId: 'jira',
    name: 'Jira - Create Incident',
    templateValues: {
      method: 'post',
      url: 'jira.com',
      contentType: 'json',
      paramFields: [
        {
          name: 'summary',
          label: 'Summary',
          type: 'text',
          required: true,
          placeholder: 'Enter a short summary',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
          placeholder: 'Enter detailed description',
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          required: true,
          options: [
            { value: 'high', text: 'High' },
            { value: 'medium', text: 'Medium' },
            { value: 'low', text: 'Low' },
          ],
        },
        {
          name: 'assignee',
          label: 'Assignee',
          type: 'text',
          required: false,
          placeholder: 'Assign to user',
        },
      ],
    },
  },
};
