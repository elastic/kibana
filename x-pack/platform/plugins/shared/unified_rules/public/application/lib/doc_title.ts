/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getCurrentDocTitle = (page: string): string => {
  let updatedTitle: string;

  switch (page) {
    case 'logs':
      updatedTitle = i18n.translate('xpack.unifiedRules.logs.docTitle', {
        defaultMessage: 'Logs',
      });
      break;
    case 'connectors':
      updatedTitle = i18n.translate('xpack.unifiedRules.connectors.docTitle', {
        defaultMessage: 'Connectors',
      });
      break;
    case 'rules':
      updatedTitle = i18n.translate('xpack.unifiedRules.rules.docTitle', {
        defaultMessage: 'Rules',
      });
      break;
    case 'createRule':
      updatedTitle = i18n.translate('xpack.unifiedRules.rules.createRule.docTitle', {
        defaultMessage: 'Create rule',
      });
      break;
    case 'editRule':
      updatedTitle = i18n.translate('xpack.unifiedRules.rules.editRule.docTitle', {
        defaultMessage: 'Edit rule',
      });
      break;
    case 'alerts':
      updatedTitle = i18n.translate('xpack.unifiedRules.alerts.docTitle', {
        defaultMessage: 'Alerts',
      });
      break;
    default:
      updatedTitle = i18n.translate('xpack.unifiedRules.home.docTitle', {
        defaultMessage: 'Rules',
      });
  }
  return updatedTitle;
};
