/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN = {
  ID: 'triggers_actions_ui',
  getI18nName: (i18n: any): string => {
    return i18n.translate('xpack.triggers_actions_ui.appName', {
      defaultMessage: 'Alerts and Actions',
    });
  },
};
