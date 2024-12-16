/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

import { useAppContext } from '../../../app_context';
import { uiMetricService, UIM_BACKUP_DATA_ON_PREM_CLICK } from '../../../lib/ui_metric';

const SnapshotRestoreAppLink: React.FunctionComponent = () => {
  const {
    plugins: { share },
  } = useAppContext();

  const snapshotRestoreUrl = share.url.locators
    .get('SNAPSHOT_RESTORE_LOCATOR')
    ?.useUrl({ page: 'snapshots' });

  return (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiButton
      href={snapshotRestoreUrl}
      onClick={() => {
        uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_BACKUP_DATA_ON_PREM_CLICK);
      }}
      data-test-subj="snapshotRestoreLink"
    >
      <FormattedMessage
        id="xpack.upgradeAssistant.overview.snapshotRestoreLink"
        defaultMessage="Create snapshot"
      />
    </EuiButton>
  );
};

export const OnPremBackup: React.FunctionComponent = () => {
  return (
    <>
      <EuiText>
        <p>
          {i18n.translate('xpack.upgradeAssistant.overview.backupStepDescription', {
            defaultMessage: 'Make sure you have a current snapshot before making any changes.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="s" />

      <SnapshotRestoreAppLink />
    </>
  );
};
