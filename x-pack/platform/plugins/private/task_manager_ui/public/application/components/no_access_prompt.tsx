/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const NoAccessPrompt: React.FC = () => (
  <EuiEmptyPrompt
    iconType="lock"
    data-test-subj="taskManagerUiNoAccessPrompt"
    title={
      <h2>
        {i18n.translate('xpack.taskManagerUi.noAccess.title', {
          defaultMessage: 'You need permission to view Kibana background tasks',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.taskManagerUi.noAccess.body', {
          defaultMessage:
            'This page is available to users with the Global All Kibana privilege. Contact your administrator for access.',
        })}
      </p>
    }
  />
);
