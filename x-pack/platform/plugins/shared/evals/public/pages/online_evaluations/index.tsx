/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldNumber,
  EuiFieldText,
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
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import {
  useCancelOnlineRun,
  useOnlineRun,
  useOnlineRunLogs,
  useOnlineSuites,
  useRunOnlineSuiteNow,
  type OnlineSuiteListItem,
} from '../../hooks/use_online_evals_api';
import * as i18n from './translations';

interface LatestRunState {
  runId: string;
  suiteId: string;
  workflowExecutionId: string;
}

export const OnlineEvaluationsPage: React.FC = () => {
  const history = useHistory();
  const { data, isLoading, error } = useOnlineSuites();
  const runNow = useRunOnlineSuiteNow();
  const cancelRun = useCancelOnlineRun();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'evalsOnlineRunModalTitle' });

  const [selectedSuite, setSelectedSuite] = useState<OnlineSuiteListItem | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [taskConnectorId, setTaskConnectorId] = useState('');
  const [judgeConnectorId, setJudgeConnectorId] = useState('');
  const [repetitions, setRepetitions] = useState<number>(3);
  const [suiteParamsText, setSuiteParamsText] = useState('{}');
  const [suiteParamsError, setSuiteParamsError] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<LatestRunState | null>(null);

  const { data: executionData } = useOnlineRun(latestRun?.workflowExecutionId, { pollMs: 2000 });
  const { data: logsData } = useOnlineRunLogs(latestRun?.workflowExecutionId, {
    pollMs: 4000,
    size: 50,
    page: 1,
  });

  const openRunModal = (suite: OnlineSuiteListItem) => {
    setSelectedSuite(suite);
    setSuiteParamsError(null);
    setIsRunModalOpen(true);
  };

  const closeRunModal = () => {
    setIsRunModalOpen(false);
  };

  const columns: Array<EuiBasicTableColumn<OnlineSuiteListItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_SUITE,
        width: '240px',
        render: (_name: string, suite: OnlineSuiteListItem) => (
          <EuiLink onClick={() => openRunModal(suite)}>{suite.name}</EuiLink>
        ),
      },
      {
        field: 'id',
        name: i18n.COLUMN_SUITE_ID,
        width: '240px',
        truncateText: true,
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
            onClick: (suite: OnlineSuiteListItem) => openRunModal(suite),
          },
        ],
      },
    ],
    []
  );

  const onStartRun = async () => {
    if (!selectedSuite) return;

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
                data-test-subj="evalsOnlineViewRunDetailsButton"
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
                data-test-subj="evalsOnlineCancelRunButton"
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
                data-test-subj="evalsOnlineExecutionLogs"
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
                <EuiFieldText
                  name="taskConnectorId"
                  value={taskConnectorId}
                  onChange={(e) => setTaskConnectorId(e.target.value)}
                  fullWidth
                  data-test-subj="evalsOnlineTaskConnectorId"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.JUDGE_CONNECTOR_LABEL} fullWidth>
                <EuiFieldText
                  name="judgeConnectorId"
                  value={judgeConnectorId}
                  onChange={(e) => setJudgeConnectorId(e.target.value)}
                  fullWidth
                  data-test-subj="evalsOnlineJudgeConnectorId"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.REPETITIONS_LABEL} fullWidth>
                <EuiFieldNumber
                  value={repetitions}
                  onChange={(e) => setRepetitions(Number(e.target.value))}
                  min={1}
                  fullWidth
                  data-test-subj="evalsOnlineRepetitions"
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
                  data-test-subj="evalsOnlineSuiteParams"
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
              data-test-subj="evalsOnlineStartRunButton"
            >
              {i18n.START_RUN_BUTTON}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
