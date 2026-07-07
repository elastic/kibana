/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import type { LaunchedExperimentConfig } from '../../../common/experiments/run_experiment';
import {
  isTerminalExecutionStatus,
  sumScoresIngested,
  useWorkflowExecutions,
} from '../../hooks/use_experiments_api';
import { WorkflowRunProgress } from '../../components/workflow_run_progress';
import { LaunchedConfigSummary } from '../../components/launched_config_summary';
import * as i18n from './translations';

interface RunOverviewLocationState {
  experimentConfig?: LaunchedExperimentConfig;
  /** Nicer connector display names, keyed by connector id (lost on hard refresh). */
  connectorNamesById?: Record<string, string>;
}

const splitCsv = (value: string | null): string[] =>
  value ? value.split(',').filter(Boolean) : [];

/**
 * Landing page for a cross-model "Run now": each selected model was launched as
 * its own experiment (its own execution id / list row), so there is no single
 * experiment to land on. This page polls every launched execution, shows per-model
 * progress, links to each model's detail once scores land, and offers a compare
 * action for two-model runs.
 */
export const RunOverviewPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { search, state } = useLocation<RunOverviewLocationState | undefined>();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const workflowExecutionIds = useMemo(
    () => splitCsv(params.get('workflow_execution_id')),
    [params]
  );
  const executionIds = useMemo(() => splitCsv(params.get('execution_id')), [params]);
  const connectorIds = useMemo(() => splitCsv(params.get('connector')), [params]);

  const { executions: views } = useWorkflowExecutions(workflowExecutionIds);

  const config = state?.experimentConfig;
  const connectorNamesById = useMemo(() => state?.connectorNamesById ?? {}, [state]);

  const models = useMemo(
    () =>
      executionIds.map((executionId, index) => {
        const connectorId = connectorIds[index];
        const workflowExecutionId = workflowExecutionIds[index];
        const view = views[index];
        const label = connectorNamesById[connectorId] ?? connectorId ?? executionId;
        const scores = sumScoresIngested(view?.data);
        const status = view?.data?.status;
        const settled = status ? isTerminalExecutionStatus(status) : false;
        return {
          executionId,
          connectorId,
          workflowExecutionId,
          label,
          scores,
          status,
          settled,
          hasResults: scores > 0,
        };
      }),
    [executionIds, connectorIds, workflowExecutionIds, views, connectorNamesById]
  );

  const labelByWorkflowId = useMemo(() => {
    const map = new Map<string, string>();
    for (const model of models) {
      if (model.workflowExecutionId) {
        map.set(model.workflowExecutionId, model.label);
      }
    }
    return map;
  }, [models]);

  const canCompare = models.length === 2 && models.every((model) => model.hasResults);

  const openDetails = useCallback(
    (executionId: string, workflowExecutionId?: string) => {
      const detailParams = new URLSearchParams({ execution_id: executionId });
      if (workflowExecutionId) {
        detailParams.set('workflow_execution_id', workflowExecutionId);
      }
      history.push(`/experiments/${encodeURIComponent(executionId)}?${detailParams.toString()}`);
    },
    [history]
  );

  const onCompare = useCallback(() => {
    if (!canCompare) {
      return;
    }
    const [a, b] = models;
    const compareParams = new URLSearchParams({
      type: 'execution',
      baseline: a.executionId,
      target: b.executionId,
    });
    history.push(`/compare?${compareParams.toString()}`);
  }, [canCompare, models, history]);

  if (models.length === 0) {
    return (
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiEmptyPrompt
          iconType="iInCircle"
          title={<h2>{i18n.EMPTY_TITLE}</h2>}
          body={<p>{i18n.EMPTY_BODY}</p>}
          actions={
            <EuiButton onClick={() => history.push('/')} data-test-subj="evalsRunOverviewBackEmpty">
              {i18n.BACK_TO_EXPERIMENTS}
            </EuiButton>
          }
        />
      </EuiPageSection>
    );
  }

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h2>{i18n.TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            {i18n.SUBTITLE}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="arrowLeft"
            onClick={() => history.push('/')}
            data-test-subj="evalsRunOverviewBack"
          >
            {i18n.BACK_TO_EXPERIMENTS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {config && (
        <>
          <LaunchedConfigSummary config={config} />
          <EuiSpacer size="l" />
        </>
      )}

      <EuiTitle size="s">
        <h3>{i18n.SECTION_PROGRESS}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <WorkflowRunProgress executions={views} getLabel={(id) => labelByWorkflowId.get(id)} />

      <EuiSpacer size="l" />

      <EuiTitle size="s">
        <h3>{i18n.SECTION_RESULTS}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {models.map((model) => (
        <React.Fragment key={model.executionId}>
          <EuiPanel hasBorder paddingSize="m" data-test-subj="evalsRunOverviewModelRow">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{model.label}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {model.status && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color={model.settled ? 'success' : 'primary'}>
                        {model.status}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {model.hasResults ? i18n.scoresIngested(model.scores) : i18n.RESULTS_PENDING}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="inspect"
                  onClick={() => openDetails(model.executionId, model.workflowExecutionId)}
                  data-test-subj="evalsRunOverviewViewDetails"
                >
                  {i18n.VIEW_DETAILS}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}

      <EuiSpacer size="s" />
      {models.length === 2 ? (
        <EuiToolTip content={canCompare ? undefined : i18n.COMPARE_PENDING_HINT}>
          <EuiButton
            fill
            iconType="diff"
            isDisabled={!canCompare}
            onClick={onCompare}
            data-test-subj="evalsRunOverviewCompare"
          >
            {i18n.COMPARE}
          </EuiButton>
        </EuiToolTip>
      ) : (
        <EuiText size="xs" color="subdued">
          {i18n.COMPARE_HINT_MANY}
        </EuiText>
      )}
    </EuiPageSection>
  );
};
