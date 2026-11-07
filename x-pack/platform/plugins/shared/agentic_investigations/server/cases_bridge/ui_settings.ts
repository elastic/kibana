/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING,
  OPEN_CASES_FOR_INVESTIGATIONS_SETTING,
  OPEN_CASES_FOR_INVESTIGATIONS_VISIBILITY_SETTING,
} from '../../common/cases_bridge';

export const registerCaseBridgeUiSettings = (uiSettings: UiSettingsServiceSetup): void => {
  uiSettings.register({
    [CLOSE_CASE_WHEN_INVESTIGATIONS_CLOSE_SETTING]: {
      name: i18n.translate(
        'xpack.agenticInvestigations.settings.closeCaseWhenInvestigationsClose',
        {
          defaultMessage: 'Close the case when all its linked investigations close',
        }
      ),
      description: i18n.translate(
        'xpack.agenticInvestigations.settings.closeCaseWhenInvestigationsCloseDescription',
        {
          defaultMessage:
            'Closing a case always closes its linked investigations. Turn this on to also close a case when the last of its linked investigations closes.',
        }
      ),
      value: false,
      schema: schema.boolean(),
      category: ['securitySolution'],
      requiresPageReload: false,
    },
    [OPEN_CASES_FOR_INVESTIGATIONS_SETTING]: {
      name: i18n.translate('xpack.agenticInvestigations.settings.openCasesForInvestigations', {
        defaultMessage: 'Open a case for every AlertZero investigation',
      }),
      description: i18n.translate(
        'xpack.agenticInvestigations.settings.openCasesForInvestigationsDescription',
        {
          defaultMessage:
            "When a Worker opens an investigation, it also opens a case from the AI investigation template, and the investigation's proposals, hypotheses, and impact are added to that case.",
        }
      ),
      value: false,
      schema: schema.boolean(),
      category: ['securitySolution'],
      technicalPreview: true,
      // The case view and the list read it when they render.
      requiresPageReload: true,
    },
    [OPEN_CASES_FOR_INVESTIGATIONS_VISIBILITY_SETTING]: {
      name: i18n.translate(
        'xpack.agenticInvestigations.settings.openCasesForInvestigationsVisibility',
        {
          defaultMessage: 'Visibility of cases opened for investigations',
        }
      ),
      description: i18n.translate(
        'xpack.agenticInvestigations.settings.openCasesForInvestigationsVisibilityDescription',
        {
          defaultMessage:
            "Restricted cases are visible only to their assignees. A restricted case is assigned to the user the Worker runs as; a Worker that runs without a user profile can't open one, so its investigation gets no case.",
        }
      ),
      type: 'select',
      options: ['public', 'restricted'],
      optionLabels: {
        public: i18n.translate(
          'xpack.agenticInvestigations.settings.openCasesForInvestigationsVisibility.public',
          { defaultMessage: 'Public' }
        ),
        restricted: i18n.translate(
          'xpack.agenticInvestigations.settings.openCasesForInvestigationsVisibility.restricted',
          { defaultMessage: 'Restricted' }
        ),
      },
      value: 'public',
      schema: schema.oneOf([schema.literal('public'), schema.literal('restricted')]),
      category: ['securitySolution'],
      technicalPreview: true,
      requiresPageReload: false,
    },
  });
};
