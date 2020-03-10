/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { history } from '../../../../../utils/history';

export function CancelButton() {
  return (
    <EuiButtonEmpty
      onClick={() => {
        history.push({
          pathname: '/settings/agent-configuration',
          search: history.location.search
        });
      }}
    >
      {i18n.translate('xpack.apm.agentConfig.settingsPage.cancelButton', {
        defaultMessage: 'Cancel'
      })}
    </EuiButtonEmpty>
  );
}
