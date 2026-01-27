/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { ActionsMenuGroup } from '@kbn/workflows-extensions/public';
import {
  createCaseStepCommonDefinition,
  CreateCaseStepTypeId,
} from '../../common/workflows/steps/create_case';

export const createCaseStepDefinition: PublicStepDefinition = {
  ...createCaseStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document_edit').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('xpack.cases.workflowSteps.createCase.label', {
    defaultMessage: 'Create case',
  }),
  description: i18n.translate('xpack.cases.workflowSteps.createCase.description', {
    defaultMessage: 'Creates a new case with the specified attributes',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowSteps.createCase.documentation.details', {
      defaultMessage:
        'This step creates a new case in the cases system. You can specify title, description, tags, assignees, severity, category, connector configuration, sync settings, and custom fields. The step returns the complete created case object.',
    }),
    examples: [
      `## Basic case creation
\`\`\`yaml
- name: create_security_case
  type: ${CreateCaseStepTypeId}
  with:
    title: "Security incident detected"
    description: "Suspicious activity detected in system logs"
    tags: ["security", "incident", "automated"]
    owner: "securitySolution"
    connector:
      id: "none"
      name: "none"
      type: ".none"
      fields: null
    settings:
      syncAlerts: true
\`\`\``,
      `## Case with assignees and severity
\`\`\`yaml
- name: create_high_severity_case
  type: ${CreateCaseStepTypeId}
  with:
    title: "Critical alert requires immediate attention"
    description: "Multiple high-priority alerts triggered"
    tags: ["critical", "high-priority"]
    owner: "securitySolution"
    severity: "critical"
    assignees:
      - uid: "user-123"
      - uid: "user-456"
    connector:
      id: "none"
      name: "none"
      type: ".none"
      fields: null
    settings:
      syncAlerts: true
      extractObservables: true
\`\`\``,
      `## Case with category and custom fields
\`\`\`yaml
- name: create_categorized_case
  type: ${CreateCaseStepTypeId}
  with:
    title: "Infrastructure issue"
    description: "Network connectivity problems detected"
    tags: ["infrastructure", "network"]
    owner: "observability"
    category: "Network"
    severity: "high"
    customFields:
      - key: "priority_level"
        type: "text"
        value: "P1"
      - key: "auto_assigned"
        type: "toggle"
        value: true
    connector:
      id: "none"
      name: "none"
      type: ".none"
      fields: null
    settings:
      syncAlerts: true
\`\`\``,
      `## Using data from previous steps
\`\`\`yaml
- name: analyze_alerts
  type: elasticsearch.search
  with:
    index: ".alerts-*"
    query:
      match:
        kibana.alert.severity: "critical"

- name: create_case_from_alerts
  type: ${CreateCaseStepTypeId}
  with:
    title: "Automated case from critical alerts"
    description: \${{ "Found " + steps.analyze_alerts.output.hits.total.value + " critical alerts" }}
    tags: ["automated", "critical-alerts"]
    owner: "securitySolution"
    severity: "critical"
    connector:
      id: "none"
      name: "none"
      type: ".none"
      fields: null
    settings:
      syncAlerts: true
\`\`\``,
    ],
  },
  actionsMenuGroup: ActionsMenuGroup.kibana,
};
