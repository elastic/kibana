/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import {
  DEFAULT_RUN_NOW_REPETITIONS,
  useCancelExperimentRun,
  useExperimentRun,
  useExperimentRunLogs,
  useExperimentSuites,
  useRunExperimentSuiteNow,
  type ExperimentSuiteListItem,
} from '../../hooks/use_experiments_api';
import { useInferenceConnectors } from '../../hooks/use_inference_connectors';
import * as i18n from './translations';

interface LatestRunState {
  runId: string;
  suiteId: string;
  workflowExecutionId: string;
}

export const ExperimentsPage: React.FC = () => {
  const history = useHistory();
  const { data, isLoading, error } = useExperimentSuites();
  const runNow = useRunExperimentSuiteNow();
  const cancelRun = useCancelExperimentRun();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'evalsExperimentRunModalTitle' });

  const { data: connectors, isLoading: isLoadingConnectors } = useInferenceConnectors();

  const [selectedSuite, setSelectedSuite] = useState<ExperimentSuiteListItem | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedTaskConnector, setSelectedTaskConnector] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedJudgeConnector, setSelectedJudgeConnector] = useState<EuiComboBoxOptionOption[]>(
    []
  );
  const [repetitions, setRepetitions] = useState<number>(DEFAULT_RUN_NOW_REPETITIONS);
  const [suiteParamsText, setSuiteParamsText] = useState('{}');
  const [suiteParamsError, setSuiteParamsError] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<LatestRunState | null>(null);

  // When the user picks a suite, seed the repetitions input from the suite's
  // own default so the form reflects what the suite author intended. The
  // server still falls back to DEFAULT_SUITE_REPETITIONS when this is absent,
  // so an undefined value here just means "no opinion".
  useEffect(() => {
    if (!selectedSuite) return;
    setRepetitions(selectedSuite.default_repetitions ?? DEFAULT_RUN_NOW_REPETITIONS);
  }, [selectedSuite]);

  const connectorOptions: EuiComboBoxOptionOption[] = useMemo(
    () =>
      (connectors ?? []).map((c) => ({
        label: `${c.name} (${c.type})`,
        value: c.connectorId,
      })),
    [connectors]
  );

  const { data: executionData } = useExperimentRun(latestRun?.workflowExecutionId, {
    pollMs: 2000,
  });
  const isRunTerminal = Boolean(
    executionData?.execution?.status &&
      TerminalExecutionStatuses.includes(executionData.execution.status)
  );
  const { data: logsData } = useExperimentRunLogs(latestRun?.workflowExecutionId, {
    pollMs: 4000,
    size: 50,
    page: 1,
    stopPolling: isRunTerminal,
  });

  const openRunModal = (suite: ExperimentSuiteListItem) => {
    setSelectedSuite(suite);
    setSuiteParamsError(null);
    setIsRunModalOpen(true);
  };

  const closeRunModal = () => {
    setIsRunModalOpen(false);
  };

  const columns: Array<EuiBasicTableColumn<ExperimentSuiteListItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_SUITE,
        width: '220px',
        render: (_name: string, suite: ExperimentSuiteListItem) => (
          <EuiLink onClick={() => openRunModal(suite)}>{suite.name}</EuiLink>
        ),
      },
      {
        field: 'id',
        name: i18n.COLUMN_SUITE_ID,
        width: '200px',
        truncateText: true,
      },
      {
        field: 'tags',
        name: i18n.COLUMN_TAGS,
        width: '200px',
        render: (tags?: string[]) => (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {(tags ?? []).map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        truncateText: true,
        render: (value?: string) => value ?? '-',
      },
      {
        name: i18n.COLUMN_ACTIONS,
        width: '120px',
        actions: [
          {
            name: i18n.RUN_NOW_BUTTON,
            description: i18n.RUN_NOW_BUTTON,
            type: 'icon',
            icon: 'play',
            onClick: (suite: ExperimentSuiteListItem) => openRunModal(suite),
          },
        ],
      },
    ],

    []
  );

  const taskConnectorId = (selectedTaskConnector[0]?.value as string) ?? '';
  const judgeConnectorId = (selectedJudgeConnector[0]?.value as string) ?? '';

  const onStartRun = async () => {
    if (!selectedSuite || !taskConnectorId || !judgeConnectorId) return;

    let suiteParams: Record<string, unknown> | undefined;
    try {
      if (suiteParamsError) {
        setSuiteParamsError(null);
      }
      suiteParams = suiteParamsText.trim().length
        ? (JSON.parse(suiteParamsText) as Record<string, unknown>)
        : {};
    } catch (e) {
      setSuiteParamsError(e instanceof Error ? e.message : String(e));
      return;
    }

    const result = await runNow.mutateAsync({
      suite_id: selectedSuite.id,
      task_connector_id: taskConnectorId,
      judge_connector_id: judgeConnectorId,
      suite_params: suiteParams,
      repetitions,
    });

    setLatestRun({
      runId: result.run_id,
      suiteId: result.suite_id,
      workflowExecutionId: result.workflow_execution_id,
    });

    closeRunModal();
  };

  // When the Workflows plugins are missing, every interactive control on this
  // page would 503. Render a friendly empty prompt instead — the server tells
  // us exactly which plugins are missing via `data.missing_plugins`.
  if (data && data.available === false) {
    return (
      <EuiPageSection paddingSize="l" alignment="center">
        <EuiEmptyPrompt
          iconType="logoWorkplaceSearch"
          title={<h2>{i18n.UNAVAILABLE_TITLE}</h2>}
          body={
            <>
              <EuiText size="s">
                <p>{data.unavailable_reason ?? i18n.UNAVAILABLE_REASON_FALLBACK}</p>
              </EuiText>
              {data.missing_plugins && data.missing_plugins.length > 0 ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.UNAVAILABLE_MISSING_PLUGINS_LABEL}{' '}
                      {data.missing_plugins.map((id, idx) => (
                        <React.Fragment key={id}>
                          <EuiCode>{id}</EuiCode>
                          {idx < (data.missing_plugins?.length ?? 0) - 1 ? ', ' : ''}
                        </React.Fragment>
                      ))}
                    </p>
                  </EuiText>
                </>
              ) : null}
            </>
          }
          data-test-subj="evalsExperimentsUnavailablePrompt"
        />
      </EuiPageSection>
    );
  }

  return (
    <>
      {latestRun && (
        <>
          <EuiPageSection paddingSize="m">
            <EuiTitle size="s">
              <h3>{i18n.LATEST_RUN_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCallOut
              title={`${i18n.WORKFLOW_EXECUTION_LABEL}: ${latestRun.workflowExecutionId}`}
              iconType="iInCircle"
              announceOnMount
            >
              <EuiText size="s">
                <p>
                  <strong>{i18n.STATUS_LABEL}: </strong>
                  {executionData?.execution?.status ?? '-'}
                </p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                onClick={() => history.push(`/runs/${latestRun.runId}`)}
                data-test-subj="evalsExperimentViewRunDetailsButton"
              >
                {i18n.VIEW_RUN_DETAILS_BUTTON}
              </EuiButton>{' '}
              <EuiButton
                size="s"
                color="danger"
                onClick={() =>
                  cancelRun.mutate({ workflowExecutionId: latestRun.workflowExecutionId })
                }
                isLoading={cancelRun.isLoading}
                data-test-subj="evalsExperimentCancelRunButton"
              >
                {i18n.CANCEL_RUN_BUTTON}
              </EuiButton>
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h4>{i18n.LOGS_TITLE}</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="text"
                paddingSize="s"
                isCopyable
                overflowHeight={240}
                data-test-subj="evalsExperimentExecutionLogs"
              >
                {(logsData?.logs ?? [])
                  .slice()
                  .reverse()
                  .map((l) => `${l.timestamp} ${l.level ?? 'info'} ${l.message}`)
                  .join('\n')}
              </EuiCodeBlock>
            </EuiCallOut>
          </EuiPageSection>
          <EuiHorizontalRule margin="none" />
        </>
      )}

      <EuiPageSection paddingSize="m">
        <EuiText size="s">
          <p>{i18n.PAGE_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCallOut title={i18n.RUNS_TAB_CALLOUT_TITLE} iconType="inspect" size="s">
          <EuiText size="xs">
            <p>{i18n.RUNS_TAB_CALLOUT_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiButton
            size="s"
            onClick={() => history.push('/')}
            data-test-subj="evalsExperimentViewRunsButton"
          >
            {i18n.VIEW_RUNS_BUTTON}
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="m" />

        <EuiBasicTable
          items={data?.suites ?? []}
          columns={columns}
          loading={isLoading}
          tableCaption={i18n.COLUMN_SUITE}
          noItemsMessage={error ? String(error) : undefined}
        />
      </EuiPageSection>

      {isRunModalOpen && selectedSuite && (
        <EuiModal
          onClose={closeRunModal}
          initialFocus="[name=taskConnectorId]"
          aria-labelledby={modalTitleId}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>{i18n.RUN_MODAL_TITLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                <strong>{selectedSuite.name}</strong> ({selectedSuite.id})
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiForm component="form">
              <EuiFormRow label={i18n.TASK_CONNECTOR_LABEL} fullWidth>
                <EuiComboBox
                  singleSelection={{ asPlainText: true }}
                  options={connectorOptions}
                  selectedOptions={selectedTaskConnector}
                  onChange={setSelectedTaskConnector}
                  isLoading={isLoadingConnectors}
                  fullWidth
                  data-test-subj="evalsExperimentTaskConnectorId"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.JUDGE_CONNECTOR_LABEL} fullWidth>
                <EuiComboBox
                  singleSelection={{ asPlainText: true }}
                  options={connectorOptions}
                  selectedOptions={selectedJudgeConnector}
                  onChange={setSelectedJudgeConnector}
                  isLoading={isLoadingConnectors}
                  fullWidth
                  data-test-subj="evalsExperimentJudgeConnectorId"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.REPETITIONS_LABEL} fullWidth>
                <EuiFieldNumber
                  value={repetitions}
                  onChange={(e) => setRepetitions(Number(e.target.value))}
                  min={1}
                  fullWidth
                  data-test-subj="evalsExperimentRepetitions"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.SUITE_PARAMS_LABEL}
                fullWidth
                isInvalid={Boolean(suiteParamsError)}
                error={suiteParamsError ?? undefined}
              >
                <EuiTextArea
                  value={suiteParamsText}
                  onChange={(e) => setSuiteParamsText(e.target.value)}
                  isInvalid={Boolean(suiteParamsError)}
                  fullWidth
                  rows={6}
                  data-test-subj="evalsExperimentSuiteParams"
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={closeRunModal}>{i18n.CANCEL_BUTTON}</EuiButton>
            <EuiButton
              fill
              onClick={onStartRun}
              isLoading={runNow.isLoading}
              isDisabled={!taskConnectorId || !judgeConnectorId}
              data-test-subj="evalsExperimentStartRunButton"
            >
              {i18n.START_RUN_BUTTON}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
