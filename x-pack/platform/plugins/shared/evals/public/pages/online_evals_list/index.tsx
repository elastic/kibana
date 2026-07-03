/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageSection,
  EuiSpacer,
  EuiSwitch,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import {
  useDeleteOnlineEvalWorkflow,
  useOnlineEvalWorkflows,
  useToggleOnlineEvalWorkflow,
  type OnlineEvalWorkflowListItem,
} from '../../hooks/use_online_eval_workflows';
import { CreateOnlineEvalFlyout } from '../../components/create_online_eval_flyout';

const WORKFLOWS_DOCS_URL = 'https://www.elastic.co/docs/explore-analyze/workflows';

const tableCaption = i18n.translate('xpack.evals.onlineEvaluations.list.tableCaption', {
  defaultMessage: 'Online evaluations workflows',
});

export const OnlineEvalsListPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { canManage } = useEvalsPermissions();
  const [workflowPendingDelete, setWorkflowPendingDelete] =
    React.useState<OnlineEvalWorkflowListItem | null>(null);
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = React.useState(false);

  const { data, isLoading, error, refetch } = useOnlineEvalWorkflows();
  const toggleOnlineEvalWorkflow = useToggleOnlineEvalWorkflow();
  const deleteOnlineEvalWorkflow = useDeleteOnlineEvalWorkflow();

  const workflows = data?.workflows ?? [];
  const noWorkflows = !isLoading && !error && workflows.length === 0;
  const isWorkflowsApiUnavailable =
    error != null &&
    isHttpFetchError(error) &&
    (error.response?.status === 403 || error.response?.status === 404);

  const columns: Array<EuiBasicTableColumn<OnlineEvalWorkflowListItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.evals.onlineEvaluations.list.columns.name', {
        defaultMessage: 'Name',
      }),
      render: (name: string, item) => (
        <EuiLink {...reactRouterNavigate(history, `/online/${item.id}`)}>
          <strong>{name}</strong>
        </EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.list.columns.enabled', {
        defaultMessage: 'Enabled',
      }),
      width: '120px',
      render: (item: OnlineEvalWorkflowListItem) => (
        <EuiSwitch
          label={i18n.translate('xpack.evals.onlineEvaluations.list.toggleEnabledLabel', {
            defaultMessage: 'Enabled',
          })}
          compressed
          checked={item.enabled}
          disabled={!canManage || toggleOnlineEvalWorkflow.isLoading}
          onChange={(event) => {
            toggleOnlineEvalWorkflow.mutate({
              workflowId: item.id,
              enabled: event.target.checked,
            });
          }}
          data-test-subj={`onlineEvalEnabledSwitch-${item.id}`}
        />
      ),
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.list.columns.schedule', {
        defaultMessage: 'Schedule',
      }),
      render: (item: OnlineEvalWorkflowListItem) => item.parsedConfig?.every ?? '-',
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.list.columns.evaluators', {
        defaultMessage: 'Evaluators',
      }),
      render: (item: OnlineEvalWorkflowListItem) => {
        if (!item.parsedConfig) {
          return '-';
        }

        return item.parsedConfig.evaluators
          .map(({ name, version }) => (version ? `${name}@${version}` : name))
          .join(', ');
      },
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.list.columns.sampling', {
        defaultMessage: 'Sampling',
      }),
      render: (item: OnlineEvalWorkflowListItem) => {
        if (!item.parsedConfig) {
          return '-';
        }

        return i18n.translate('xpack.evals.onlineEvaluations.list.samplingSummary', {
          defaultMessage: '{window}m window / {lag}m lag / max {maxTraces} traces',
          values: {
            window: item.parsedConfig.windowMinutes,
            lag: item.parsedConfig.lagMinutes,
            maxTraces: item.parsedConfig.maxTracesPerRun,
          },
        });
      },
    },
    {
      name: i18n.translate('xpack.evals.onlineEvaluations.list.columns.actions', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      align: 'right',
      render: (item: OnlineEvalWorkflowListItem) => (
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.evals.onlineEvaluations.list.deleteButton.ariaLabel', {
            defaultMessage: 'Delete workflow {name}',
            values: { name: item.name },
          })}
          iconType="trash"
          color="danger"
          isDisabled={!canManage || deleteOnlineEvalWorkflow.isLoading}
          onClick={() => setWorkflowPendingDelete(item)}
          data-test-subj={`deleteOnlineEvalButton-${item.id}`}
        />
      ),
    },
  ];

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="plusInCircle"
              onClick={() => setIsCreateFlyoutOpen(true)}
              isDisabled={!canManage || isWorkflowsApiUnavailable}
              data-test-subj="createOnlineEvalButton"
            >
              {i18n.translate('xpack.evals.onlineEvaluations.list.createButtonLabel', {
                defaultMessage: 'Create online evaluation',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {isWorkflowsApiUnavailable ? (
          <EuiEmptyPrompt
            iconType="lock"
            title={
              <h2>
                {i18n.translate('xpack.evals.onlineEvaluations.list.unavailable.title', {
                  defaultMessage: 'Workflows management is unavailable',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.evals.onlineEvaluations.list.unavailable.body', {
                  defaultMessage:
                    'Online evaluations depend on the Workflows Management plugin and an Enterprise license.',
                })}
              </p>
            }
            actions={[
              <EuiLink href={WORKFLOWS_DOCS_URL} target="_blank" external>
                {i18n.translate('xpack.evals.onlineEvaluations.list.unavailable.docsLink', {
                  defaultMessage: 'Read workflows documentation',
                })}
              </EuiLink>,
            ]}
          />
        ) : error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            title={
              <h2>
                {i18n.translate('xpack.evals.onlineEvaluations.list.error.title', {
                  defaultMessage: 'Failed to load online evaluations',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.evals.onlineEvaluations.list.error.body', {
                  defaultMessage: '{message}',
                  values: { message: String(error) },
                })}
              </p>
            }
            actions={[
              <EuiButton iconType="refresh" onClick={() => refetch()}>
                {i18n.translate('xpack.evals.onlineEvaluations.list.retryButton', {
                  defaultMessage: 'Retry',
                })}
              </EuiButton>,
            ]}
          />
        ) : noWorkflows ? (
          <EuiEmptyPrompt
            iconType="visLine"
            title={
              <h2>
                {i18n.translate('xpack.evals.onlineEvaluations.list.empty.title', {
                  defaultMessage: 'No online evaluations yet',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.evals.onlineEvaluations.list.empty.body', {
                  defaultMessage:
                    'Create your first online evaluation to monitor evaluator scores over time.',
                })}
              </p>
            }
          />
        ) : (
          <EuiBasicTable<OnlineEvalWorkflowListItem>
            tableCaption={tableCaption}
            items={workflows}
            columns={columns}
            loading={isLoading}
            rowProps={(item) => ({
              onClick: () => history.push(`/online/${item.id}`),
              style: { cursor: 'pointer' },
            })}
            data-test-subj="onlineEvalsTable"
          />
        )}
      </EuiPageSection>
      {workflowPendingDelete ? (
        <EuiConfirmModal
          title={i18n.translate('xpack.evals.onlineEvaluations.list.deleteModal.title', {
            defaultMessage: 'Delete online evaluation',
          })}
          onCancel={() => setWorkflowPendingDelete(null)}
          onConfirm={() => {
            deleteOnlineEvalWorkflow.mutate({ workflowId: workflowPendingDelete.id });
            setWorkflowPendingDelete(null);
          }}
          cancelButtonText={i18n.translate(
            'xpack.evals.onlineEvaluations.list.deleteModal.cancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.evals.onlineEvaluations.list.deleteModal.confirmButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          buttonColor="danger"
        >
          <p>
            {i18n.translate('xpack.evals.onlineEvaluations.list.deleteModal.body', {
              defaultMessage:
                'Delete workflow "{name}"? Existing online scores will remain in the data stream.',
              values: { name: workflowPendingDelete.name },
            })}
          </p>
        </EuiConfirmModal>
      ) : null}
      {isCreateFlyoutOpen ? (
        <EuiFlyout onClose={() => setIsCreateFlyoutOpen(false)} ownFocus size="m">
          <CreateOnlineEvalFlyout onClose={() => setIsCreateFlyoutOpen(false)} />
        </EuiFlyout>
      ) : null}
    </>
  );
};
