/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiButtonEmptyColor } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { APMLink } from '../../../../../shared/Links/apm/APMLink';

export function CancelButton({
  color = 'primary'
}: {
  color?: EuiButtonEmptyColor;
}) {
  return (
    <APMLink path={`/settings/agent-configuration`}>
      <EuiButtonEmpty color={color}>
        {i18n.translate('xpack.apm.agentConfig.settingsPage.cancelButton', {
          defaultMessage: 'Cancel'
        })}
      </EuiButtonEmpty>
    </APMLink>
  );
}
