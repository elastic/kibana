/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, Fragment } from 'react';
import {
  EuiEmptyPrompt,
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiLink,
} from '@elastic/eui';
import { SectionError, SectionLoading } from '../../../components';
import { UIM_RESTORE_LIST_LOAD, BASE_PATH } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { useLoadRestores } from '../../../services/http';
import { useAppState } from '../../../services/state';
import { uiMetricService } from '../../../services/ui_metric';
import { RestoreTable } from './restore_table';

const ONE_SECOND_MS = 1000;
const TEN_SECONDS_MS = 10 * 1000;
const THIRTY_SECONDS_MS = 30 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

const INTERVAL_OPTIONS: number[] = [
  TEN_SECONDS_MS,
  THIRTY_SECONDS_MS,
  ONE_MINUTE_MS,
  FIVE_MINUTES_MS,
];
export const RestoreList: React.FunctionComponent = () => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  // Check that we have all index privileges needed to view recovery information
  const [appState] = useAppState();
  const { permissions: { missingIndexPrivileges } = { missingIndexPrivileges: [] } } = appState;

  // Render permission missing screen
  if (missingIndexPrivileges.length) {
    return (
      <EuiEmptyPrompt
        iconType="securityApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.deniedPermissionTitle"
              defaultMessage="You're missing index privileges"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.deniedPermissionDescription"
              defaultMessage="To view snapshot restore status, you must have {indexPrivilegesCount,
                plural, one {this index privilege} other {these index privileges}} for one or more indices: {indexPrivileges}."
              values={{
                indexPrivileges: missingIndexPrivileges.join(', '),
                indexPrivilegesCount: missingIndexPrivileges.length,
              }}
            />
          </p>
        }
      />
    );
  }

  // State for tracking interval picker
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<number>(INTERVAL_OPTIONS[1]);

  // Load restores
  const { error, loading, data: restores = [], polling, changeInterval } = useLoadRestores(
    currentInterval
  );

  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_RESTORE_LIST_LOAD);
  }, []);

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.restoreList.loadingRestoresDescription"
          defaultMessage="Loading restores…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreList.LoadingRestoresErrorMessage"
            defaultMessage="Error loading restores"
          />
        }
        error={error}
      />
    );
  } else if (restores && restores.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.emptyPromptTitle"
              defaultMessage="You don't have any restored snapshots"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreList.emptyPromptDescription"
                defaultMessage="Go to {snapshotsLink} to start a restore."
                values={{
                  snapshotsLink: (
                    <EuiLink href={`#${BASE_PATH}/snapshots`}>
                      <FormattedMessage
                        id="xpack.snapshotRestore.restoreList.emptyPromptDescriptionLink"
                        defaultMessage="Snapshots"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </Fragment>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    content = (
      <Fragment>
        <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="srRestoreListIntervalMenu"
              button={
                <EuiButtonEmpty
                  size="xs"
                  type="text"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => setIsIntervalMenuOpen(!isIntervalMenuOpen)}
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreList.intervalMenuButtonText"
                    defaultMessage="Refresh data every {interval}"
                    values={{
                      interval:
                        currentInterval >= ONE_MINUTE_MS ? (
                          <FormattedMessage
                            id="xpack.snapshotRestore.restoreList.intervalMenu.minutesIntervalValue"
                            defaultMessage="{minutes} {minutes, plural, one {minute} other {minutes}}"
                            values={{ minutes: Math.ceil(currentInterval / ONE_MINUTE_MS) }}
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.snapshotRestore.restoreList.intervalMenu.secondsIntervalValue"
                            defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                            values={{ seconds: Math.ceil(currentInterval / ONE_SECOND_MS) }}
                          />
                        ),
                    }}
                  />
                </EuiButtonEmpty>
              }
              isOpen={isIntervalMenuOpen}
              closePopover={() => setIsIntervalMenuOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel
                items={INTERVAL_OPTIONS.map(interval => (
                  <EuiContextMenuItem
                    key={interval}
                    icon="empty"
                    onClick={() => {
                      changeInterval(interval);
                      setCurrentInterval(interval);
                      setIsIntervalMenuOpen(false);
                    }}
                  >
                    {interval >= ONE_MINUTE_MS ? (
                      <FormattedMessage
                        id="xpack.snapshotRestore.restoreList.intervalMenu.minutesIntervalValue"
                        defaultMessage="{minutes} {minutes, plural, one {minute} other {minutes}}"
                        values={{ minutes: Math.ceil(interval / ONE_MINUTE_MS) }}
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.snapshotRestore.restoreList.intervalMenu.secondsIntervalValue"
                        defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                        values={{ seconds: Math.ceil(interval / ONE_SECOND_MS) }}
                      />
                    )}
                  </EuiContextMenuItem>
                ))}
              />
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{polling ? <EuiLoadingSpinner size="m" /> : null}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <RestoreTable restores={restores || []} />
      </Fragment>
    );
  }

  return <section data-test-subj="restoreList">{content}</section>;
};
