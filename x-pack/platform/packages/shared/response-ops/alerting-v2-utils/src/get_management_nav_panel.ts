/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StandardNodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

const PANEL_ID = 'alerting_v2_panel';

/**
 * Returns the management-section navigation entries that solution side-nav
 * trees should append to their "Stack / Project Settings" footer for the
 * Alerting v2 management apps. Callers spread the result unconditionally:
 *
 * ```ts
 * children: [
 *   ...existingChildren,
 *   ...getAlertingV2ManagementNavPanel(),
 * ]
 * ```
 *
 * Safe to call in deployments where the `alertingVTwo` plugin never loads:
 * none of the four `management:*` deep links are registered there, so
 * `getNodeStatus` drops each linkless leaf and `toMenuItem` then drops the
 * emptied panel, leaving no stray heading.
 */
export const getAlertingV2ManagementNavPanel = (): StandardNodeDefinition[] => {
  return [
    {
      id: PANEL_ID,
      title: i18n.translate('xpack.alertingV2.nav.title', {
        defaultMessage: 'Alerting V2 Preview',
      }),
      children: [
        { link: 'management:rules' },
        { link: 'management:episodes' },
        { link: 'management:action_policies' },
        { link: 'management:execution_history' },
      ],
    },
  ];
};
