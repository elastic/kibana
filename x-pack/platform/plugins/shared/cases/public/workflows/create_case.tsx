/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  createCaseStepCommonDefinition,
  CreateCaseStepTypeId,
} from '../../common/workflows/steps/create_case';
import {
  buildBooleanSelectionHandler,
  buildConnectorSelectionHandler,
  buildCustomFieldKeySelectionHandler,
  buildCustomFieldTypeSelectionHandler,
  buildEnumSelectionHandler,
  buildStringValueSelectionHandler,
  buildTemplateSelectionHandler,
  createCasesWorkflowAutocompleteDataSources,
} from './case_autocomplete';
import { caseSeverityOptions, connectorTypeOptions, ownerOptions } from './case_enum_options';
import * as i18n from './translations';

export const createCreateCaseStepDefinition = (core: CoreSetup) => {
  const {
    getConnectors,
    getTemplateOptions,
    getCustomFieldOptions,
    getCategoryOptions,
    getTagOptions,
  } = createCasesWorkflowAutocompleteDataSources(core);

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
    editorHandlers: {
      input: {
        owner: {
          selection: {
            search: async (input: string) => {
              const query = input.trim().toLowerCase();
              return query
                ? ownerOptions.filter((owner) => owner.label.toLowerCase().includes(query))
                : ownerOptions;
            },
            resolve: async (value: string) => {
              return ownerOptions.find((owner) => owner.value === value) ?? null;
            },
            getDetails: async (
              value: string,
              _context: unknown,
              option: { value: string; label: string } | null
            ) => {
              if (option) {
                return {
                  message: i18n.OWNER_VALID_MESSAGE(option.label),
                };
              }

              return {
                message: i18n.OWNER_NOT_SUPPORTED_MESSAGE(
                  value,
                  ownerOptions.map((owner) => owner.value).join(', ')
                ),
              };
            },
          },
        },
        'connector.id': {
          selection: buildConnectorSelectionHandler(getConnectors, 'id'),
        },
        'connector.name': {
          selection: buildConnectorSelectionHandler(getConnectors, 'name'),
        },
        'connector.type': {
          selection: buildEnumSelectionHandler(connectorTypeOptions, i18n.CONNECTOR_TYPE_LABEL),
        },
        severity: {
          selection: buildEnumSelectionHandler(caseSeverityOptions, i18n.SEVERITY_LABEL),
        },
        category: {
          selection: buildStringValueSelectionHandler(getCategoryOptions, i18n.CATEGORY_LABEL),
        },
        tags: {
          selection: buildStringValueSelectionHandler(getTagOptions, i18n.TAG_LABEL),
        },
        'settings.syncAlerts': {
          selection: buildBooleanSelectionHandler(i18n.ALERT_SYNC_LABEL),
        },
        'settings.extractObservables': {
          selection: buildBooleanSelectionHandler(i18n.OBSERVABLE_EXTRACTION_LABEL),
        },
        // editorHandlers do not currently support array item paths reliably.
        // Use customFields.key and customFields.type to provide discoverability for values from case configuration.
        'customFields.key': {
          selection: buildCustomFieldKeySelectionHandler(getCustomFieldOptions),
        },
        'customFields.type': {
          selection: buildCustomFieldTypeSelectionHandler(getCustomFieldOptions),
        },
        template: {
          selection: buildTemplateSelectionHandler(getTemplateOptions),
        },
      } as Record<string, unknown>,
    },
  });
};
