/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import type { Template } from '../../../../common/types/domain/template/v1';

// Mock data store (simulates database)
export const mockTemplates: Template[] = [
  {
    templateId: 'template-1',
    name: 'Security Incident Template',
    owner: 'securitySolution',
    definition: yaml.dump({
      fields: [
        {
          control: 'text',
          name: 'incident_type',
          label: 'Incident Type',
          type: 'keyword',
          default: 'malware installed on target host',
          metadata: { required: true },
        },
        {
          control: 'select',
          name: 'severity',
          label: 'Severity Level',
          type: 'keyword',
          metadata: { options: ['low', 'medium', 'high', 'critical'] },
        },
      ],
    }),
    templateVersion: 1,
    deletedAt: null,
  },
  {
    templateId: 'template-2',
    name: 'Observability Alert Template',
    owner: 'observability',
    definition: yaml.dump({
      fields: [
        {
          control: 'text',
          name: 'alert_source',
          label: 'Alert Source',
          type: 'keyword',
          metadata: {},
        },
      ],
    }),
    templateVersion: 2,
    deletedAt: null,
  },
  {
    templateId: 'template-3',
    name: 'Deleted Template',
    owner: 'securitySolution',
    definition: yaml.dump({ fields: [] }),
    templateVersion: 1,
    deletedAt: '2024-01-15T10:00:00.000Z',
  },
];
