/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';

export function LoadingStatePrompt() {
  return (
    <EuiEmptyPrompt
      title={
        <div>
          {i18n.translate('xpack.apm.loading.prompt', {
            defaultMessage: 'Loading...'
          })}
        </div>
      }
      titleSize="s"
    />
  );
}
