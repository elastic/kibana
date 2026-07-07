/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nBundles = {
  toolConfirmation: {
    title: i18n.translate('xpack.agentBuilder.runner.toolConfirmation.title', {
      defaultMessage: 'Permission to call tool',
    }),
    message: (toolId: string) =>
      i18n.translate('xpack.agentBuilder.runner.toolConfirmation.message', {
        defaultMessage: 'Agent wants to call tool "{toolId}". Do you want to proceed?',
        values: { toolId },
      }),
    confirmText: i18n.translate('xpack.agentBuilder.runner.toolConfirmation.confirmText', {
      defaultMessage: 'Allow',
    }),
    cancelText: i18n.translate('xpack.agentBuilder.runner.toolConfirmation.cancelText', {
      defaultMessage: 'Deny',
    }),
  },
};
