/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiPanel,
  EuiText,
  EuiButton,
  EuiButtonIcon,
  EuiSpacer,
  EuiToolTip,
  EuiCallOut,
} from '@elastic/eui';

import { useAppDependencies } from '../../../../index';
import { UpdateRetentionModalProvider, UpdateRetentionSetting } from '../../../../components';

interface Props {
  retentionSettings: {
    retentionSchedule: string;
  };
  onRetentionScheduleUpdated: () => void;
  isLoading: boolean;
  error: any;
}

export const PolicyRetentionSchedule: React.FunctionComponent<Props> = ({
  retentionSettings,
  onRetentionScheduleUpdated,
  isLoading,
  error,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const { FormattedMessage } = i18n;

  if (isLoading) {
    return (
      <Fragment>
        <EuiPanel>
          <EuiLoadingContent lines={1} />
        </EuiPanel>
        <EuiSpacer />
      </Fragment>
    );
  }

  if (error) {
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyRetentionSchedulePanel.errorFetchingRetentionScheduleTitle"
              defaultMessage="Error fetching retention schedule"
            />
          }
          color="danger"
          iconType="alert"
        >
          {error.data && error.data.message ? <p>{error.data.message}</p> : null}
          <EuiButton iconType="refresh" color="danger" onClick={onRetentionScheduleUpdated}>
            <FormattedMessage
              id="xpack.snapshotRestore.policyRetentionSchedulePanel.errorFetchingRetentionScheduleReloadButtonLabel"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }

  if (retentionSettings && retentionSettings.retentionSchedule) {
    const { retentionSchedule } = retentionSettings;

    return (
      <Fragment>
        <EuiPanel>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleDescription"
                    defaultMessage="Snapshot retention will run on the cron schedule: {cronSchedule}."
                    values={{ cronSchedule: <strong>{retentionSchedule}</strong> }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <UpdateRetentionModalProvider>
                {(updateRetentionPrompt: UpdateRetentionSetting) => {
                  return (
                    <EuiToolTip
                      position="top"
                      content={
                        <FormattedMessage
                          id="xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleEditLinkTooltip"
                          defaultMessage="Edit retention schedule"
                        />
                      }
                    >
                      <EuiButtonIcon
                        iconType="pencil"
                        onClick={() =>
                          updateRetentionPrompt(retentionSchedule, onRetentionScheduleUpdated)
                        }
                        aria-label={i18n.translate(
                          'xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleEditLinkAriaLabel',
                          {
                            defaultMessage: 'Edit retention schedule',
                          }
                        )}
                      />
                    </EuiToolTip>
                  );
                }}
              </UpdateRetentionModalProvider>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer />
      </Fragment>
    );
  } else {
    return (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.policyRetentionSchedulePanel.noScheduleConfiguredWarningTitle"
              defaultMessage="Retention schedule not configured"
            />
          }
          color="warning"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.snapshotRestore.policyRetentionSchedulePanel.noScheduleConfiguredWarningDescription"
              defaultMessage="You have one or more policies with retention, but you do not have a retention schedule configured."
            />
          </p>
          <UpdateRetentionModalProvider>
            {(updateRetentionPrompt: UpdateRetentionSetting) => {
              return (
                <EuiButton
                  iconType="plusInCircle"
                  color="warning"
                  onClick={() => updateRetentionPrompt(undefined, onRetentionScheduleUpdated)}
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyRetentionSchedulePanel.retentionScheduleAddButtonLabel"
                    defaultMessage="Add retention schedule"
                  />
                </EuiButton>
              );
            }}
          </UpdateRetentionModalProvider>
        </EuiCallOut>
        <EuiSpacer />
      </Fragment>
    );
  }
};
