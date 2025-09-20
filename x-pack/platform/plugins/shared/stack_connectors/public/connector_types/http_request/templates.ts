/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { IconType } from '@elastic/eui';
import type { HttpRequestConfig } from '.';

export const SERVICE_PROVIDERS: Record<
  string,
  { name: string; iconClass: IconType; selectMessage: string }
> = {
  jira_templated: {
    name: 'Jira (Templated)',
    iconClass: lazy(() => import('./logos/jira')),
    selectMessage: 'Send a request to Jira',
  },
};

export const TEMPLATES: Record<
  string,
  { name: string; serviceId: string; templateValues: HttpRequestConfig }
> = {
  'jira:add-comment': {
    serviceId: 'jira',
    name: 'Jira - Add Comment',
    templateValues: {
      method: 'post',
      url: 'http://<enter domain>/rest/api/2/issue/{{issueIdOrKey}}/comment',
      urlTemplateFields: [
        {
          name: 'issueIdOrKey',
          label: 'Issue Id or Key',
          type: 'text',
          required: true,
        },
      ],
      contentType: 'json',
      paramFields: [
        {
          name: 'comment',
          label: 'Comment',
          type: 'textarea',
          required: true,
        },
      ],
    },
  },
  'jira:create-issue': {
    serviceId: 'jira',
    name: 'Jira - Create Issue',
    templateValues: {
      method: 'post',
      url: 'http://<enter domain>/rest/api/2/issue',
      contentType: 'json',
      urlTemplateFields: [],
      paramFields: [
        {
          name: 'projectId',
          label: 'Project Id',
          type: 'text',
          required: true,
          placeholder: '',
        },
        {
          name: 'issueType',
          label: 'Issue Type',
          type: 'select',
          required: true,
          options: [
            { value: 'task', text: 'Task' },
            { value: 'story', text: 'Story' },
            { value: 'bug', text: 'Bug' },
            { value: 'epic', text: 'Epic' },
            { value: 'initiative', text: 'Initiative' },
            { value: 'theme', text: 'Theme' },
            { value: 'discovery', text: 'Discovery' },
          ],
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          options: [
            { value: 'todo', text: 'To Do' },
            { value: 'inProgress', text: 'In Progress' },
            { value: 'done', text: 'Done' },
            { value: 'wontDo', text: `Won't Do` },
          ],
        },
        {
          name: 'summary',
          label: 'Summary',
          type: 'text',
          required: true,
          placeholder: '',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
          placeholder: '',
        },
      ],
    },
  },
};
