/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { Fragment, useCallback, useMemo } from 'react';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { hideBottomBar, showBottomBar } from '../lib/setup_mode';
import { Legacy } from '../legacy_shims';
import { CommonAlert } from '../../common/types/alerts';

interface Props {
  alert: CommonAlert;
  compressed?: boolean;
}

type KibanaDeps = {
  dataViews: DataViewsPublicPluginStart;
  charts?: ChartsPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
} & CoreStart;

export const AlertConfiguration: React.FC<Props> = (props: Props) => {
  const { alert, compressed } = props;
  const [showFlyout, setShowFlyout] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(alert.enabled);
  const [isMuted, setIsMuted] = React.useState(alert.muteAll);
  const [isSaving, setIsSaving] = React.useState(false);

  const { services } = useKibana<KibanaDeps>();

  async function disableAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_disable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.disableAlert.errorTitle', {
          defaultMessage: `Unable to disable rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function enableAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_enable`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.enableAlert.errorTitle', {
          defaultMessage: `Unable to enable rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function muteAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_mute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.muteAlert.errorTitle', {
          defaultMessage: `Unable to mute rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }
  async function unmuteAlert() {
    setIsSaving(true);
    try {
      await Legacy.shims.http.post(`${BASE_ALERTING_API_PATH}/rule/${alert.id}/_unmute_all`);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: i18n.translate('xpack.monitoring.alerts.panel.ummuteAlert.errorTitle', {
          defaultMessage: `Unable to unmute rule`,
        }),
        text: err.message,
      });
    }
    setIsSaving(false);
  }

  const onClose = useCallback(() => {
    setShowFlyout(false);
    showBottomBar();
  }, []);

  const {
    triggersActionsUi: { ruleTypeRegistry, actionTypeRegistry },
  } = Legacy.shims;
  const flyoutUi = useMemo(
    () =>
      showFlyout &&
      isValidRuleFormPlugins(services) && (
        <RuleFormFlyout
          plugins={{ ruleTypeRegistry, actionTypeRegistry, ...services }}
          id={alert.id}
          onSubmit={onClose}
          onCancel={onClose}
        />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showFlyout]
  );

  return (
    <Fragment>
      <EuiFlexGroup
        justifyContent={compressed ? 'flexStart' : 'spaceBetween'}
        gutterSize={compressed ? 'm' : 'xs'}
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            size={compressed ? 's' : 'm'}
            onClick={() => {
              setShowFlyout(true);
              hideBottomBar();
            }}
          >
            {i18n.translate('xpack.monitoring.alerts.panel.editAlert', {
              defaultMessage: `Edit rule`,
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            name="disable"
            disabled={isSaving}
            checked={!isEnabled}
            onChange={async () => {
              if (isEnabled) {
                setIsEnabled(false);
                await disableAlert();
              } else {
                setIsEnabled(true);
                await enableAlert();
              }
            }}
            label={
              <FormattedMessage
                id="xpack.monitoring.alerts.panel.disableTitle"
                defaultMessage="Disable"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            name="mute"
            disabled={isSaving}
            checked={isMuted}
            data-test-subj="muteSwitch"
            onChange={async () => {
              if (isMuted) {
                setIsMuted(false);
                await unmuteAlert();
              } else {
                setIsMuted(true);
                await muteAlert();
              }
            }}
            label={
              <FormattedMessage
                id="xpack.monitoring.alerts.panel.muteTitle"
                defaultMessage="Mute"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {flyoutUi}
    </Fragment>
  );
};
