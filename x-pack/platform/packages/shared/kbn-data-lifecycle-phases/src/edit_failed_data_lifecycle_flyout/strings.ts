/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const editFailedDataLifecycleFlyoutStrings = {
  inheritLabel: i18n.translate(
    'xpack.dataLifecyclePhases.editFailedDataLifecycleFlyout.inheritLabel',
    {
      defaultMessage: 'Inherit lifecycle',
    }
  ),
  enableFailureStoreLabel: i18n.translate(
    'xpack.dataLifecyclePhases.editFailedDataLifecycleFlyout.enableFailureStoreLabel',
    {
      defaultMessage: 'Enable failure store',
    }
  ),
  enableFailureStoreHelpText: i18n.translate(
    'xpack.dataLifecyclePhases.editFailedDataLifecycleFlyout.enableFailureStoreHelpText',
    {
      defaultMessage:
        'Disabling this feature will not delete existing data within your failure store.',
    }
  ),
};
