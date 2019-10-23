/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { kfetch } from 'ui/kfetch';
import {
  EuiSpacer,
  EuiCallOut,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Alert } from '../../../../alerting/server/types';
import { getSetupModeState, addSetupModeCallback } from '../../lib/setup_mode';
import {
  NUMBER_OF_MIGRATED_ALERTS,
  KIBANA_ALERTING_ENABLED,
  ALERT_TYPE_PREFIX,
} from '../../../common/constants';
import { Migration } from './migration';

interface MigrationStatusProps {
  clusterUuid: string;
  emailAddress: string;
}

export const MigrationStatus: React.FC<MigrationStatusProps> = (props: MigrationStatusProps) => {
  const { clusterUuid, emailAddress } = props;

  const [setupModeEnabled, setSetupModeEnabled] = React.useState(getSetupModeState().enabled);
  const [kibanaAlerts, setKibanaAlerts] = React.useState<Alert[]>([]);

  const [showMigrationFlyout, setShowMigrationFlyout] = React.useState(false);

  React.useEffect(() => {
    async function fetchMigrationStatus() {
      const alerts = await kfetch({ method: 'GET', pathname: `/api/alert/_find` });
      const monitoringAlerts = alerts.data.filter((alert: Alert) =>
        alert.alertTypeId.startsWith(ALERT_TYPE_PREFIX)
      );
      setKibanaAlerts(monitoringAlerts);
    }

    fetchMigrationStatus();
  }, [clusterUuid, setupModeEnabled, showMigrationFlyout]);

  addSetupModeCallback(() => setSetupModeEnabled(getSetupModeState().enabled));

  function renderContent() {
    let flyout = null;
    if (showMigrationFlyout) {
      flyout = (
        <EuiFlyout onClose={() => setShowMigrationFlyout(false)} aria-labelledby="flyoutTitle">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.monitoring.alerts.migration.flyoutTitle', {
                  defaultMessage: 'Alerting migration',
                })}
              </h2>
            </EuiTitle>
            <EuiText>
              <p>
                {i18n.translate('xpack.monitoring.alerts.migration.flyoutSubtitle', {
                  defaultMessage: 'Configure an email server and email address to receive alerts.',
                })}
              </p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <Migration
              clusterUuid={clusterUuid}
              emailAddress={emailAddress}
              onDone={() => setShowMigrationFlyout(false)}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      );
    }

    const allMigrated = kibanaAlerts.length === NUMBER_OF_MIGRATED_ALERTS;
    if (allMigrated) {
      if (setupModeEnabled) {
        return (
          <Fragment>
            <EuiCallOut
              color="success"
              title={i18n.translate('xpack.monitoring.alerts.migrate.upToDate', {
                defaultMessage: 'Kibana alerting is up to date!',
              })}
              iconType="flag"
            >
              <p>
                <EuiButtonEmpty onClick={() => setShowMigrationFlyout(true)}>
                  {i18n.translate('xpack.monitoring.alerts.migrate.manage', {
                    defaultMessage: 'Manage email action and/or receiving email address',
                  })}
                </EuiButtonEmpty>
              </p>
            </EuiCallOut>
            {flyout}
          </Fragment>
        );
      }
    } else {
      return (
        <Fragment>
          <EuiCallOut
            color="warning"
            title={i18n.translate('xpack.monitoring.alerts.migrate.needToMigrateTitle', {
              defaultMessage: 'Hey! We made alerting better!',
            })}
          >
            <p>
              <EuiButtonEmpty onClick={() => setShowMigrationFlyout(true)}>
                {i18n.translate('xpack.monitoring.alerts.migrate.needToMigrate', {
                  defaultMessage:
                    'Click here to migrate cluster alerts to our new alerting platform.',
                })}
              </EuiButtonEmpty>
            </p>
          </EuiCallOut>
          {flyout}
        </Fragment>
      );
    }
  }

  if (!KIBANA_ALERTING_ENABLED) {
    return null;
  }

  const content = renderContent();
  if (content) {
    return (
      <Fragment>
        {content}
        <EuiSpacer />
      </Fragment>
    );
  }

  return null;
};
