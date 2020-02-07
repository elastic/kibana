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
import { APP_RESTORE_INDEX_PRIVILEGES } from '../../../../../common/constants';
import { SectionError, SectionLoading, Error } from '../../../components';
import { UIM_RESTORE_LIST_LOAD } from '../../../constants';
import { useAppDependencies } from '../../../index';
import { useLoadRestores } from '../../../services/http';
import { uiMetricService } from '../../../services/ui_metric';
import { linkToSnapshots } from '../../../services/navigation';
import { RestoreTable } from './restore_table';
import { WithPrivileges, NotAuthorizedSection } from '../../../lib/authorization';

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

  // State for tracking interval picker
  const [isIntervalMenuOpen, setIsIntervalMenuOpen] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<number>(INTERVAL_OPTIONS[1]);

  // Load restores
  const { error, isLoading, data: restores = [], isInitialRequest, sendRequest } = useLoadRestores(
    currentInterval
  );

  // Track component loaded
  const { trackUiMetric } = uiMetricService;
  useEffect(() => {
    trackUiMetric(UIM_RESTORE_LIST_LOAD);
  }, []);

  let content: JSX.Element;

  if (isInitialRequest) {
    if (isLoading) {
      // Because we're polling for new data, we only want to hide the list during the initial fetch.
      content = (
        <SectionLoading>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreList.loadingRestoresDescription"
            defaultMessage="Loading restores…"
          />
        </SectionLoading>
      );
    } else if (error) {
      // If we get an error while polling we don't need to show it to the user because they can still
      // work with the table.
      content = (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.loadingRestoresErrorMessage"
              defaultMessage="Error loading restores"
            />
          }
          error={error as Error}
        />
      );
    }
  } else {
    if (restores && restores.length === 0) {
      content = (
        <EuiEmptyPrompt
          iconType="managementApp"
          title={
            <h1>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreList.emptyPromptTitle"
                defaultMessage="No restored snapshots"
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
                      <EuiLink href={linkToSnapshots()}>
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
                        sendRequest();
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
            <EuiFlexItem grow={false}>
              {isLoading ? <EuiLoadingSpinner size="m" /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <RestoreTable restores={restores || []} />
        </Fragment>
      );
    }
  }

  return (
    <WithPrivileges privileges={APP_RESTORE_INDEX_PRIVILEGES.map(name => `index.${name}`)}>
      {({ hasPrivileges, privilegesMissing }) =>
        hasPrivileges ? (
          <section data-test-subj="restoreList">{content}</section>
        ) : (
          <NotAuthorizedSection
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreList.deniedPrivilegeTitle"
                defaultMessage="You're missing index privileges"
              />
            }
            message={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreList.deniedPrivilegeDescription"
                defaultMessage="To view snapshot restore status, you must have {privilegesCount,
                  plural, one {this index privilege} other {these index privileges}} for one or more indices: {missingPrivileges}."
                values={{
                  missingPrivileges: privilegesMissing.index!.join(', '),
                  privilegesCount: privilegesMissing.index!.length,
                }}
              />
            }
          />
        )
      }
    </WithPrivileges>
  );
};
