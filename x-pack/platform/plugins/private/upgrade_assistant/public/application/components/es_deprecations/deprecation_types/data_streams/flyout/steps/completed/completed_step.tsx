/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const ReindexingCompletedFlyoutStep: React.FunctionComponent = () => {
  return (
    <>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.acceptChangesTitle"
              defaultMessage="Data Stream Reindexing Complete"
            />
          </h3>
        </EuiTitle>
        <p>200 indices successfully reindexed</p>
      </EuiFlyoutBody>
    </>
  );
};
