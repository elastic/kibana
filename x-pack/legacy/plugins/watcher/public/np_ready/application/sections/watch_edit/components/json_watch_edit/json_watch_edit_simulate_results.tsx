/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext } from 'react';

import {
  EuiBasicTable,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ExecutedWatchDetails,
  ExecutedWatchResults,
} from '../../../../../../../common/types/watch_types';
import { getTypeFromAction } from '../../watch_edit_actions';
import { WatchContext } from '../../watch_context';
import { WatchStatus, SectionError } from '../../../../components';

export const JsonWatchEditSimulateResults = ({
  executeResults,
  executeDetails,
  onCloseFlyout,
  error,
}: {
  executeResults: ExecutedWatchResults | null;
  executeDetails: ExecutedWatchDetails;
  onCloseFlyout: () => void;
  error: any;
}) => {
  const { watch } = useContext(WatchContext);

  const { actionModes } = executeDetails;

  const getTableData = () => {
    const actions = watch.watch && watch.watch.actions;
    if (executeResults && actions) {
      const actionStatuses =
        executeResults.watchStatus && executeResults.watchStatus.actionStatuses;
      return Object.keys(actions).map(actionKey => {
        const actionStatus = actionStatuses.find(status => status.id === actionKey);
        return {
          actionId: actionKey,
          actionType: getTypeFromAction(actions[actionKey]),
          actionMode: actionModes[actionKey],
          actionState: actionStatus && actionStatus.state,
          actionReason: actionStatus && actionStatus.lastExecutionReason,
        };
      });
    }
    return [];
  };

  const actionsTableData = getTableData();

  const columns = [
    {
      field: 'actionId',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.actionColumnLabel',
        {
          defaultMessage: 'ID',
        }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'actionType',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.typeColumnLabel',
        {
          defaultMessage: 'Type',
        }
      ),
      truncateText: true,
    },
    {
      field: 'actionMode',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.modeColumnLabel',
        {
          defaultMessage: 'Mode',
        }
      ),
    },
    {
      field: 'actionState',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.stateColumnLabel',
        {
          defaultMessage: 'State',
        }
      ),
      dataType: 'string',
      render: (actionState: string) => <WatchStatus status={actionState} />,
    },
    {
      field: 'actionReason',
      name: i18n.translate(
        'xpack.watcher.sections.watchEdit.simulateResults.table.reasonColumnLabel',
        {
          defaultMessage: 'Reason',
        }
      ),
    },
  ];

  const flyoutTitle = (
    <EuiTitle size="s">
      <h2 id="simulateResultsFlyOutTitle" data-test-subj="simulateResultsFlyoutTitle">
        {i18n.translate('xpack.watcher.sections.watchEdit.simulateResults.title', {
          defaultMessage: 'Simulation results',
        })}
      </h2>
    </EuiTitle>
  );

  if (error) {
    return (
      <EuiFlyout
        onClose={() => {
          onCloseFlyout();
        }}
        aria-labelledby="simulateResultsFlyOutTitle"
      >
        <EuiFlyoutHeader hasBorder>{flyoutTitle}</EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SectionError
            title={
              <FormattedMessage
                id="xpack.watcher.sections.watchEdit.simulateResults.errorTitle"
                defaultMessage="Cannot simulate watch"
              />
            }
            error={error}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  if (!executeResults) {
    return null;
  }

  const {
    watchStatus: { state },
    details,
  } = executeResults;

  return (
    <EuiFlyout
      onClose={() => {
        onCloseFlyout();
      }}
      data-test-subj="simulateResultsFlyout"
      aria-labelledby="simulateResultsFlyOutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        {flyoutTitle}
        <EuiSpacer size="xs" />
        <WatchStatus status={state} size="m" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {actionsTableData && actionsTableData.length > 0 && (
          <Fragment>
            <EuiText>
              <h5>
                {i18n.translate(
                  'xpack.watcher.sections.watchEdit.simulateResults.actionsSectionTitle',
                  {
                    defaultMessage: 'Actions',
                  }
                )}
              </h5>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable columns={columns} items={actionsTableData} />
            <EuiSpacer size="l" />
          </Fragment>
        )}
        <EuiText>
          <h5>
            {i18n.translate(
              'xpack.watcher.sections.watchEdit.simulateResults.simulationOutputSectionTitle',
              {
                defaultMessage: 'Simulation output',
              }
            )}
          </h5>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiCodeBlock language="json">{JSON.stringify(details, null, 2)}</EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
