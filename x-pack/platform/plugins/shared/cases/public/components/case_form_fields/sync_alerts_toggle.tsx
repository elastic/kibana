/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../create/translations';

interface Props {
  isLoading: boolean;
}

const SyncAlertsToggleComponent: React.FC<Props> = ({ isLoading }) => {
  return (
    <UseField
      path="syncAlerts"
      component={ToggleField}
      config={{ defaultValue: true }}
      componentProps={{
        idAria: 'caseSyncAlerts',
        'data-test-subj': 'caseSyncAlerts',
        euiFieldProps: {
          disabled: isLoading,
          label: i18n.SYNC_ALERTS_LABEL,
        },
      }}
    />
  );
};

SyncAlertsToggleComponent.displayName = 'SyncAlertsToggleComponent';

export const SyncAlertsToggle = memo(SyncAlertsToggleComponent);
