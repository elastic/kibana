/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';

export const DataStreamBadge: FunctionComponent = () => {
  return (
    <EuiBadge data-test-subj="dataStreamBadge" color="primary">
      {i18n.translate('xpack.snapshotRestore.policyForm.setSettings.dataStreamBadgeContent', {
        defaultMessage: 'Data stream',
      })}
    </EuiBadge>
  );
};
