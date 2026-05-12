/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageSection,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { useLLMConnectors } from '../../hooks/use_llm_connectors';
import { SuiteDetailFlyout } from './suite_detail_flyout';
import type { SuiteInfo } from './suite_detail_flyout';

interface Suite {
  id: string;
  name: string;
  tags: string[];
  config_path?: string;
  slack_channel?: string;
}

interface SuiteStatus {
  suite_id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  run_id?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

const INTERNAL_VERSION = '1';

const useSuites = () => {
  const { services } = useKibana<{ http: HttpStart }>();
  return useQuery({
    queryKey: ['evals', 'suites'],
    queryFn: () =>
      services.http!.get<{ suites: Suite[] }>('/internal/evals/suites', {
        version: INTERNAL_VERSION,
      }),
  });
};

const useSuiteStatus = (suiteId: string) => {
  const { services } = useKibana<{ http: HttpStart }>();
  return useQuery({
    queryKey: ['evals', 'suites', suiteId, 'status'],
    queryFn: () =>
      services.http!.get<SuiteStatus>(`/internal/evals/suites/${suiteId}/status`, {
        version: INTERNAL_VERSION,
      }),
    refetchInterval: (data) => (data?.status === 'running' ? 5000 : false),
  });
};

const useRunSuite = () => {
  const { services } = useKibana<{ http: HttpStart; notifications: NotificationsStart }>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      suiteId,
      connectorId: cId,
      project,
    }: {
      suiteId: string;
      connectorId: string;
      project?: string;
    }) =>
      services.http!.post(`/internal/evals/suites/${suiteId}/run`, {
        version: INTERNAL_VERSION,
        body: JSON.stringify({ connector_id: cId, ...(project ? { project } : {}) }),
      }),
    onSuccess: (_, { suiteId }) => {
      services.notifications!.toasts.addSuccess(
        i18n.translate('xpack.evals.suites.runStarted', {
          defaultMessage: 'Evaluation suite "{suiteId}" started',
          values: { suiteId },
        })
      );
      queryClient.invalidateQueries({ queryKey: ['evals', 'suites', suiteId, 'status'] });
    },
    onError: (error: Error) => {
      services.notifications!.toasts.addError(error, {
        title: i18n.translate('xpack.evals.suites.runFailed', {
          defaultMessage: 'Failed to start suite run',
        }),
      });
    },
  });
};

const StatusBadge: React.FC<{ suiteId: string }> = ({ suiteId }) => {
  const { data } = useSuiteStatus(suiteId);
  const status = data?.status ?? 'idle';

  const colorMap: Record<string, string> = {
    idle: 'default',
    running: 'primary',
    completed: 'success',
    failed: 'danger',
  };

  return <EuiBadge color={colorMap[status] ?? 'default'}>{status}</EuiBadge>;
};

export const SuitesListPage: React.FC = () => {
  const { data, isLoading } = useSuites();
  const runSuite = useRunSuite();
  const { data: connectors, isLoading: connectorsLoading } = useLLMConnectors();
  const [runModalSuiteId, setRunModalSuiteId] = useState<string | null>(null);
  const [connectorId, setConnectorId] = useState('');
  const [projectConnectorId, setProjectConnectorId] = useState('');
  const [selectedSuite, setSelectedSuite] = useState<SuiteInfo | null>(null);

  const handleRunClick = useCallback(
    (suiteId: string) => {
      setRunModalSuiteId(suiteId);
      // Auto-select first .gen-ai connector, or first available
      const genAi = connectors?.find((c) => c.actionTypeId === '.gen-ai');
      const defaultId = genAi?.id || connectors?.[0]?.id || '';
      setConnectorId(defaultId);
      setProjectConnectorId(defaultId);
    },
    [connectors]
  );

  const handleRunConfirm = useCallback(() => {
    if (runModalSuiteId && connectorId) {
      runSuite.mutate({
        suiteId: runModalSuiteId,
        connectorId,
        project: projectConnectorId || undefined,
      });
      setRunModalSuiteId(null);
    }
  }, [runModalSuiteId, connectorId, projectConnectorId, runSuite]);

  const columns: Array<EuiBasicTableColumn<Suite>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.evals.suites.columns.name', { defaultMessage: 'Name' }),
      sortable: true,
      render: (name: string, suite: Suite) => (
        <EuiLink onClick={() => setSelectedSuite(suite)} data-test-subj="evalsSuiteName">
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'id',
      name: i18n.translate('xpack.evals.suites.columns.id', { defaultMessage: 'ID' }),
      width: '180px',
      render: (id: string) => (
        <EuiText size="s" color="subdued">
          {id}
        </EuiText>
      ),
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.evals.suites.columns.tags', { defaultMessage: 'Tags' }),
      render: (tags: string[]) => (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {tags.map((tag) => (
            <EuiFlexItem key={tag} grow={false}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('xpack.evals.suites.columns.status', { defaultMessage: 'Status' }),
      width: '120px',
      render: (suite: Suite) => <StatusBadge suiteId={suite.id} />,
    },
    {
      name: i18n.translate('xpack.evals.suites.columns.actions', { defaultMessage: 'Actions' }),
      width: '100px',
      actions: [
        {
          name: i18n.translate('xpack.evals.suites.actions.run', { defaultMessage: 'Run' }),
          description: i18n.translate('xpack.evals.suites.actions.runDescription', {
            defaultMessage: 'Run this evaluation suite',
          }),
          icon: 'play',
          type: 'icon',
          onClick: (suite: Suite) => handleRunClick(suite.id),
        },
      ],
    },
  ];

  return (
    <EuiPageSection>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={data?.suites ?? []}
        columns={columns}
        loading={isLoading}
        rowProps={{ 'data-test-subj': 'evalsSuiteRow' }}
        data-test-subj="evalsSuitesTable"
      />

      {selectedSuite && (
        <SuiteDetailFlyout
          suite={selectedSuite}
          onClose={() => setSelectedSuite(null)}
          onRun={(suiteId) => {
            setSelectedSuite(null);
            handleRunClick(suiteId);
          }}
        />
      )}

      {runModalSuiteId && (
        <EuiModal onClose={() => setRunModalSuiteId(null)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.evals.suites.runModal.title', {
                defaultMessage: 'Run suite: {suiteId}',
                values: { suiteId: runModalSuiteId },
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFormRow
              label={i18n.translate('xpack.evals.suites.runModal.projectLabel', {
                defaultMessage: 'Connector to evaluate',
              })}
              helpText={i18n.translate('xpack.evals.suites.runModal.projectHelp', {
                defaultMessage:
                  'The connector whose responses will be tested. Maps to a Playwright --project.',
              })}
            >
              <EuiSuperSelect
                options={(connectors || []).map((c) => ({
                  value: c.id,
                  inputDisplay: c.name,
                  dropdownDisplay: (
                    <>
                      <strong>{c.name}</strong>
                      <EuiText size="xs" color="subdued">
                        <p>{c.actionTypeId.replace('.', '').replace('-', ' ')}</p>
                      </EuiText>
                    </>
                  ),
                }))}
                valueOfSelected={projectConnectorId}
                onChange={setProjectConnectorId}
                isLoading={connectorsLoading}
                disabled={connectorsLoading || !connectors?.length}
                data-test-subj="evalsSuiteProjectInput"
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.evals.suites.runModal.connectorLabel', {
                defaultMessage: 'Evaluation connector (judge)',
              })}
              helpText={i18n.translate('xpack.evals.suites.runModal.connectorHelp', {
                defaultMessage:
                  'The LLM used to score and evaluate the responses from the target connector.',
              })}
            >
              <EuiSuperSelect
                options={(connectors || []).map((c) => ({
                  value: c.id,
                  inputDisplay: c.name,
                  dropdownDisplay: (
                    <>
                      <strong>{c.name}</strong>
                      <EuiText size="xs" color="subdued">
                        <p>{c.actionTypeId.replace('.', '').replace('-', ' ')}</p>
                      </EuiText>
                    </>
                  ),
                }))}
                valueOfSelected={connectorId}
                onChange={setConnectorId}
                isLoading={connectorsLoading}
                disabled={connectorsLoading || !connectors?.length}
                data-test-subj="evalsSuiteConnectorInput"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={() => setRunModalSuiteId(null)}>
              {i18n.translate('xpack.evals.suites.runModal.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButton>
            <EuiButton
              fill
              onClick={handleRunConfirm}
              disabled={!connectorId}
              isLoading={runSuite.isLoading}
              data-test-subj="evalsSuiteRunConfirmButton"
            >
              {i18n.translate('xpack.evals.suites.runModal.confirm', {
                defaultMessage: 'Start evaluation',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </EuiPageSection>
  );
};
