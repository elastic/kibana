/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  updateCaseStepCommonDefinition,
  UpdateCaseStepTypeId,
} from '../../common/workflows/steps/update_case';
import {
  buildBooleanSelectionHandler,
  buildConnectorSelectionHandler,
  buildCustomFieldKeySelectionHandler,
  buildCustomFieldTypeSelectionHandler,
  buildEnumSelectionHandler,
  buildStringValueSelectionHandler,
  createCasesWorkflowAutocompleteDataSources,
} from './case_autocomplete';

export const createUpdateCaseStepDefinition = (core: CoreSetup) => {
  const { getConnectors, getCustomFieldOptions, getCategoryOptions, getTagOptions } =
    createCasesWorkflowAutocompleteDataSources(core);

  return createPublicStepDefinition({
    ...updateCaseStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.translate('xpack.cases.workflowSteps.updateCase.label', {
      defaultMessage: 'Update case',
    }),
    description: i18n.translate('xpack.cases.workflowSteps.updateCase.description', {
      defaultMessage: 'Updates a case with the provided fields',
    }),
    documentation: {
      details: i18n.translate('xpack.cases.workflowSteps.updateCase.documentation.details', {
        defaultMessage:
          'This step first fetches the case to retrieve the latest version and then applies the requested updates.',
      }),
      examples: [
        `## Update case status and severity
\`\`\`yaml
- name: update_case
  type: ${UpdateCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    updates:
      status: "in-progress"
      severity: "high"
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
    editorHandlers: {
      input: {
        'updates.severity': {
          selection: buildEnumSelectionHandler(['low', 'medium', 'high', 'critical'], 'Severity'),
        },
        'updates.status': {
          selection: buildEnumSelectionHandler(['open', 'in-progress', 'closed'], 'Status'),
        },
        'updates.category': {
          selection: buildStringValueSelectionHandler(getCategoryOptions, 'Category'),
        },
        'updates.tags': {
          selection: buildStringValueSelectionHandler(getTagOptions, 'Tag'),
        },
        'updates.connector.id': {
          selection: buildConnectorSelectionHandler(getConnectors, 'id'),
        },
        'updates.connector.name': {
          selection: buildConnectorSelectionHandler(getConnectors, 'name'),
        },
        'updates.connector.type': {
          selection: buildEnumSelectionHandler(
            [
              '.cases-webhook',
              '.jira',
              '.none',
              '.resilient',
              '.servicenow',
              '.servicenow-sir',
              '.swimlane',
            ],
            'Connector type'
          ),
        },
        'updates.settings.syncAlerts': {
          selection: buildBooleanSelectionHandler('alert sync'),
        },
        'updates.settings.extractObservables': {
          selection: buildBooleanSelectionHandler('observable extraction'),
        },
        'updates.customFields.key': {
          selection: buildCustomFieldKeySelectionHandler(getCustomFieldOptions),
        },
        'updates.customFields.type': {
          selection: buildCustomFieldTypeSelectionHandler(getCustomFieldOptions),
        },
      } as Record<string, unknown>,
    },
  });
};
