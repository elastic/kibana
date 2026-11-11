/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const NoPermissionBanner = () => {
  return (
    <>
      <KbnWarningCallout
        title={i18n.translate('xpack.streams.noAccessToFailureStore.title', {
          defaultMessage: 'You do not have access to failure store information',
        })}
      />
      <EuiSpacer size="s" />
    </>
  );
};
