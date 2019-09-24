/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiButton } from '@elastic/eui';

import { useAppDependencies } from '../../../../index';
import { PolicyUpdateRetentionProvider } from '../../../../components';

interface Props {
  retentionSettings: {
    retentionSchedule: string;
  };
  onRetentionScheduleUpdated: () => void;
}

export const PolicyRetentionSchedule: React.FunctionComponent<Props> = ({
  retentionSettings,
  onRetentionScheduleUpdated,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const { FormattedMessage } = i18n;
  const { retentionSchedule } = retentionSettings;

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              {retentionSchedule ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.createPolicyButton"
                  defaultMessage="Snapshot retention will run on the cron schedule: {cronSchedule}."
                  values={{ cronSchedule: <strong>{retentionSchedule}</strong> }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.createPolicyButton"
                  defaultMessage="A snapshot retention schedule is not configured."
                />
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {retentionSchedule ? (
            <PolicyUpdateRetentionProvider>
              {updateRetentionPrompt => {
                return (
                  <EuiButton
                    iconType="pencil"
                    onClick={() =>
                      updateRetentionPrompt(retentionSchedule, onRetentionScheduleUpdated)
                    }
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.retentionScheduleEditLinkText"
                      defaultMessage="Edit retention schedule"
                    />{' '}
                  </EuiButton>
                );
              }}
            </PolicyUpdateRetentionProvider>
          ) : (
            <PolicyUpdateRetentionProvider>
              {updateRetentionPrompt => {
                return (
                  <EuiButton
                    iconType="plusInCircle"
                    onClick={() => updateRetentionPrompt(undefined, onRetentionScheduleUpdated)}
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepRetention.retentionScheduleAddLinkText"
                      defaultMessage="Add retention schedule"
                    />{' '}
                  </EuiButton>
                );
              }}
            </PolicyUpdateRetentionProvider>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
