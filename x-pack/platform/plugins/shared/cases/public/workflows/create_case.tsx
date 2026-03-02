/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  createCaseStepCommonDefinition,
  CreateCaseStepTypeId,
} from '../../common/workflows/steps/create_case';
import * as i18n from './translations';
import { connectorTypesOptions } from './case_enum_options';

export const createCreateCaseStepDefinition = () => {
  return createPublicStepDefinition({
    ...createCaseStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.CREATE_CASE_STEP_LABEL,
    description: i18n.CREATE_CASE_STEP_DESCRIPTION,
    documentation: {
      details: i18n.CREATE_CASE_STEP_DOCUMENTATION_DETAILS,
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
    severity: "critical"
    settings:
      syncAlerts: true
      autoExtractObersvables: true
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
    settings:
      syncAlerts: true
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
    editorHandlers: {
      config: {
        'connector-id': {
          connectorIdSelection: {
            connectorTypes: connectorTypesOptions,
            enableCreation: false,
          },
        },
      },
    },
  });
};
