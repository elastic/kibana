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
import { caseSeverityOptions, caseStatusOptions, connectorTypeOptions } from './case_enum_options';
import * as i18n from './translations';

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
    label: i18n.UPDATE_CASE_STEP_LABEL,
    description: i18n.UPDATE_CASE_STEP_DESCRIPTION,
    documentation: {
      details: i18n.UPDATE_CASE_STEP_DOCUMENTATION_DETAILS,
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
          selection: buildEnumSelectionHandler(caseSeverityOptions, i18n.SEVERITY_LABEL),
        },
        'updates.status': {
          selection: buildEnumSelectionHandler(caseStatusOptions, i18n.STATUS_LABEL),
        },
        'updates.category': {
          selection: buildStringValueSelectionHandler(getCategoryOptions, i18n.CATEGORY_LABEL),
        },
        'updates.tags': {
          selection: buildStringValueSelectionHandler(getTagOptions, i18n.TAG_LABEL),
        },
        'updates.connector.id': {
          selection: buildConnectorSelectionHandler(getConnectors, 'id'),
        },
        'updates.connector.name': {
          selection: buildConnectorSelectionHandler(getConnectors, 'name'),
        },
        'updates.connector.type': {
          selection: buildEnumSelectionHandler(connectorTypeOptions, i18n.CONNECTOR_TYPE_LABEL),
        },
        'updates.settings.syncAlerts': {
          selection: buildBooleanSelectionHandler(i18n.ALERT_SYNC_LABEL),
        },
        'updates.settings.extractObservables': {
          selection: buildBooleanSelectionHandler(i18n.OBSERVABLE_EXTRACTION_LABEL),
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
