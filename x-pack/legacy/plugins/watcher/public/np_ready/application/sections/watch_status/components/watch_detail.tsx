/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiInMemoryTable,
  EuiTitle,
  EuiButtonEmpty,
  EuiToolTip,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
} from '@elastic/eui';
import { ackWatchAction } from '../../../lib/api';
import { WatchStatus } from '../../../components';
import { PAGINATION } from '../../../../../../common/constants';
import { WatchDetailsContext } from '../watch_details_context';
import { useAppContext } from '../../../app_context';

interface ActionError {
  code: string;
  message: string;
}
interface ActionStatus {
  id: string;
  isAckable: boolean;
  state: string;
  errors: ActionError[];
}

export const WatchDetail = () => {
  const { toasts } = useAppContext();
  const { watchDetail } = useContext(WatchDetailsContext);

  const [actionStatuses, setActionStatuses] = useState<ActionStatus[]>([]);
  const [isActionStatusLoading, setIsActionStatusLoading] = useState<boolean>(false);
  const [selectedErrorAction, setSelectedErrorAction] = useState<string | null>(null);

  const { id: watchId, watchErrors, watchStatus, isSystemWatch } = watchDetail;

  const actionErrors = watchErrors && watchErrors.actionErrors;
  const currentActionStatuses = watchStatus && watchStatus.actionStatuses;

  const hasActionErrors = actionErrors && Object.keys(actionErrors).length > 0;

  useEffect(() => {
    const actionStatusesWithErrors =
      currentActionStatuses &&
      currentActionStatuses.map((currentActionStatus: ActionStatus) => {
        const errors = actionErrors && actionErrors[currentActionStatus.id];
        return {
          ...currentActionStatus,
          errors: errors || [],
        };
      });
    setActionStatuses(actionStatusesWithErrors);
  }, [watchDetail, actionErrors, currentActionStatuses]);

  const baseColumns = [
    {
      field: 'id',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.actionHeader', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'state',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: true,
      truncateText: true,
      render: (state: string) => <WatchStatus status={state} />,
    },
  ];

  const errorColumn = {
    field: 'errors',
    name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.errorsHeader', {
      defaultMessage: 'Errors',
    }),
    render: (errors: ActionError[], action: ActionStatus) => {
      const { id: actionId } = action;
      if (errors && errors.length > 0) {
        return (
          <EuiButtonEmpty
            onClick={() => setSelectedErrorAction(actionId)}
            data-test-subj="actionErrorsButton"
          >
            {i18n.translate('xpack.watcher.sections.watchDetail.watchTable.errorsCellText', {
              defaultMessage: '{total, number} {total, plural, one {error} other {errors}}',
              values: {
                total: errors.length,
              },
            })}
          </EuiButtonEmpty>
        );
      }
      return <Fragment />;
    },
  };

  const actionColumn = {
    actions: [
      {
        available: (action: ActionStatus) => action.isAckable && !isSystemWatch,
        render: (action: ActionStatus) => {
          const { id: actionId } = action;
          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.watcher.sections.watchDetail.watchTable.ackActionCellTooltipTitle',
                {
                  defaultMessage: 'Acknowledge watch action.',
                }
              )}
            >
              <EuiButtonEmpty
                iconType="check"
                isLoading={isActionStatusLoading}
                data-test-subj="acknowledgeWatchButton"
                onClick={async () => {
                  setIsActionStatusLoading(true);
                  try {
                    const newWatchStatus = await ackWatchAction(watchId, actionId);
                    const newActionStatusesWithErrors = newWatchStatus.actionStatuses.map(
                      (newActionStatus: ActionStatus) => {
                        const errors = actionErrors && actionErrors[newActionStatus.id];
                        return {
                          ...newActionStatus,
                          errors: errors || [],
                        };
                      }
                    );
                    setIsActionStatusLoading(false);
                    return setActionStatuses(newActionStatusesWithErrors);
                  } catch (e) {
                    setIsActionStatusLoading(false);
                    toasts.addDanger(
                      i18n.translate(
                        'xpack.watcher.sections.watchDetail.watchTable.ackActionErrorMessage',
                        {
                          defaultMessage: 'Error acknowledging action {actionId}',
                          values: {
                            actionId: action.id,
                          },
                        }
                      )
                    );
                  }
                }}
              >
                <FormattedMessage
                  id="xpack.watcher.sections.watchDetail.watchTable.ackActionCellTitle"
                  defaultMessage="Acknowledge"
                />
              </EuiButtonEmpty>
            </EuiToolTip>
          );
        },
      },
    ],
  };

  const columns = hasActionErrors
    ? [...baseColumns, errorColumn, actionColumn]
    : [...baseColumns, actionColumn];

  return (
    <div data-test-subj="watchDetailSection">
      {selectedErrorAction && (
        <EuiFlyout
          size="s"
          aria-labelledby="flyoutActionErrorTitle"
          data-test-subj="actionErrorsFlyout"
          onClose={() => setSelectedErrorAction(null)}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="flyoutActionErrorTitle" data-test-subj="title">
                {selectedErrorAction}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiCallOut
              title={i18n.translate('xpack.watcher.sections.watchDetail.actionErrorsCalloutTitle', {
                defaultMessage: 'This action contains errors',
              })}
              color="danger"
              iconType="cross"
              data-test-subj="errorMessage"
            >
              {actionErrors[selectedErrorAction].length > 1 ? (
                <ul>
                  {actionErrors[selectedErrorAction].map(
                    (actionError: ActionError, errorIndex: number) => (
                      <li key={`action-error-${errorIndex}`}>{actionError.message}</li>
                    )
                  )}
                </ul>
              ) : (
                <p>{actionErrors[selectedErrorAction][0].message}</p>
              )}
            </EuiCallOut>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}

      <EuiInMemoryTable
        items={actionStatuses}
        itemId="id"
        columns={columns}
        pagination={PAGINATION}
        sorting={true}
        data-test-subj="watchActionStatusTable"
        message={
          <FormattedMessage
            id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
            defaultMessage="No actions to show"
          />
        }
      />
    </div>
  );
};
