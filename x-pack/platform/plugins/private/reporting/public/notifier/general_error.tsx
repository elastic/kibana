/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { CoreStart, ToastInput } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import React from 'react';

export const getGeneralErrorToast = (
  errorText: string,
  err: Error,
  core: CoreStart
): ToastInput => ({
  text: toMountPoint(
    <>
      <EuiCallOut title={errorText} color="danger" iconType="warning">
        {err.toString()}
      </EuiCallOut>

      <EuiSpacer />

      <FormattedMessage
        id="xpack.reporting.publicNotifier.error.tryRefresh"
        defaultMessage="Try refreshing the page."
      />
    </>,
    core
  ),
  iconType: undefined,
});
