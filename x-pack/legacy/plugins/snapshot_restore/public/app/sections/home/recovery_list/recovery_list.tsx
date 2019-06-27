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
} from '@elastic/eui';
import { SectionError, SectionLoading } from '../../../components';
import { UIM_RECOVERY_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { useLoadRecoveries } from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';
import { RecoveryTable } from './recovery_table';

const INTERVAL_OPTIONS: number[] = [10 * 1000, 30 * 1000, 60 * 1000, 5 * 60 * 1000];

export const RecoveryList: React.FunctionComponent = () => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  // State for tracking interval picker
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<number>(INTERVAL_OPTIONS[1]);

  // Load recoveries
  const { error, loading, data: recoveries = [], polling, changeInterval } = useLoadRecoveries(
    currentInterval
  );

  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_RECOVERY_LIST_LOAD);
  }, []);

  let content;

  if (loading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.recoveryList.loadingRecoveriesDescription"
          defaultMessage="Loading recoveries…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.recoveryList.LoadingRecoveriesErrorMessage"
            defaultMessage="Error loading recoveries"
          />
        }
        error={error}
      />
    );
  } else if (recoveries && recoveries.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.snapshotRestore.recoveryList.emptyPromptTitle"
              defaultMessage="You don't have any snapshot recoveries"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.recoveryList.emptyPromptDescription"
                defaultMessage="Track progress of indices that are recovered from snapshots."
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
              id="srRecoveryListIntervalMenu"
              button={
                <EuiButtonEmpty
                  size="xs"
                  type="text"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => setIsIntervalMenuOpen(!isIntervalMenuOpen)}
                >
                  <FormattedMessage
                    id="xpack.snapshotRestore.recoveryList.intervalMenuButtonText"
                    defaultMessage="Refresh data every {interval}"
                    values={{
                      interval: (
                        <FormattedMessage
                          id="xpack.snapshotRestore.recoveryList.intervalMenu.intervalValue"
                          defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                          values={{ seconds: Math.ceil(currentInterval / 1000) }}
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
                    {interval >= 60 * 1000 ? (
                      <FormattedMessage
                        id="xpack.snapshotRestore.recoveryList.intervalMenu.intervalValue"
                        defaultMessage="{minutes} {minutes, plural, one {minute} other {minutes}}"
                        values={{ minutes: Math.ceil(interval / (60 * 1000)) }}
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.snapshotRestore.recoveryList.intervalMenu.intervalValue"
                        defaultMessage="{seconds} {seconds, plural, one {second} other {seconds}}"
                        values={{ seconds: Math.ceil(interval / 1000) }}
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
        <RecoveryTable recoveries={recoveries || []} />
      </Fragment>
    );
  }

  return <section data-test-subj="recoveryList">{content}</section>;
};
