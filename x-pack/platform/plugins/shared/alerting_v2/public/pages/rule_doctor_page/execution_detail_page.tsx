/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EuiStepsProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { RuleDoctorApi } from '../../services/rule_doctor_api';
import { FindingCard } from './finding_card';
import type {
  RuleDoctorExecutionDetail,
  RuleDoctorFinding,
  RuleDoctorStepProgress,
} from './types';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
const POLL_INTERVAL_MS = 4000;

const toEuiStepStatus = (
  status: string
): 'complete' | 'loading' | 'incomplete' | 'danger' | 'warning' => {
  switch (status) {
    case 'completed':
    case 'skipped':
      return 'complete';
    case 'running':
    case 'waiting':
    case 'waiting_for_input':
      return 'loading';
    case 'failed':
    case 'timed_out':
    case 'cancelled':
      return 'danger';
    default:
      return 'incomplete';
  }
};

const StepChildren: React.FC<{ step: RuleDoctorStepProgress }> = ({ step }) => {
  if (step.error) {
    return (
      <EuiText size="s" color="danger">
        {step.error}
      </EuiText>
    );
  }
  if (step.detail) {
    return (
      <EuiText size="s" color="subdued">
        {step.detail}
      </EuiText>
    );
  }
  return <></>;
};

type DetailState = 'loading' | 'running' | 'complete' | 'error';

export const ExecutionDetailPage = () => {
  const ruleDoctorApi = useService(RuleDoctorApi);
  const history = useHistory();
  const { executionId } = useParams<{ executionId: string }>();

  const [state, setState] = useState<DetailState>('loading');
  const [findings, setFindings] = useState<RuleDoctorFinding[]>([]);
  const [steps, setSteps] = useState<RuleDoctorStepProgress[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchDetail = useCallback(
    (id: string) => ruleDoctorApi.getExecution<RuleDoctorExecutionDetail>(id),
    [ruleDoctorApi]
  );

  useEffect(() => {
    mountedRef.current = true;

    const poll = async () => {
      if (!mountedRef.current) {
        stopPolling();
        return;
      }
      try {
        const detail = await fetchDetail(executionId);
        if (!mountedRef.current) return;

        setSteps(detail.steps);

        if (TERMINAL_STATUSES.has(detail.status)) {
          stopPolling();
          if (detail.status === 'completed') {
            setFindings(detail.findings);
            setState('complete');
          } else {
            setErrorMessage(detail.error ?? `Execution finished with status: ${detail.status}`);
            setState('error');
          }
        } else {
          setState('running');
        }
      } catch (e) {
        if (!mountedRef.current) return;
        stopPolling();
        setErrorMessage(e instanceof Error ? e.message : 'Failed to fetch execution');
        setState('error');
      }
    };

    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [executionId, fetchDetail, stopPolling]);

  const euiSteps: EuiStepsProps['steps'] = steps.map((step) => ({
    title: step.label,
    status: toEuiStepStatus(step.status),
    children: <StepChildren step={step} />,
  }));

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.alertingV2.ruleDoctor.executionDetail.pageTitle', {
          defaultMessage: 'Execution details',
        })}
        breadcrumbs={[
          {
            text: i18n.translate('xpack.alertingV2.ruleDoctor.breadcrumb', {
              defaultMessage: 'Rule Doctor',
            }),
            onClick: () => history.push('/doctor'),
          },
          {
            text: i18n.translate('xpack.alertingV2.ruleDoctor.executionDetail.breadcrumb', {
              defaultMessage: 'Execution',
            }),
          },
        ]}
      />
      <EuiSpacer size="l" />

      <EuiButtonEmpty iconType="arrowLeft" onClick={() => history.push('/doctor')}>
        {i18n.translate('xpack.alertingV2.ruleDoctor.executionDetail.backButton', {
          defaultMessage: 'Back to Rule Doctor',
        })}
      </EuiButtonEmpty>
      <EuiSpacer size="m" />

      {state === 'loading' && (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.alertingV2.ruleDoctor.executionDetail.loadingTitle', {
                defaultMessage: 'Loading execution...',
              })}
            </h2>
          }
        />
      )}

      {state === 'running' && (
        <>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.alertingV2.ruleDoctor.executionDetail.runningTitle', {
                defaultMessage: 'Analyzing your rules...',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          {euiSteps.length > 0 ? (
            <EuiSteps steps={euiSteps} />
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.alertingV2.ruleDoctor.executionDetail.startingAnalysis',
                    { defaultMessage: 'Starting analysis...' }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      )}

      {state === 'error' && (
        <>
          {euiSteps.length > 0 && (
            <>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.alertingV2.ruleDoctor.executionDetail.errorStepsTitle',
                    { defaultMessage: 'Analysis progress' }
                  )}
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiSteps steps={euiSteps} />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiCallOut
            title={i18n.translate('xpack.alertingV2.ruleDoctor.executionDetail.errorTitle', {
              defaultMessage: 'Analysis failed',
            })}
            color="danger"
            iconType="error"
          >
            <p>{errorMessage}</p>
          </EuiCallOut>
        </>
      )}

      {state === 'complete' && (
        <>
          {euiSteps.length > 0 && (
            <>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.alertingV2.ruleDoctor.executionDetail.stepsTitle',
                    { defaultMessage: 'Analysis progress' }
                  )}
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiSteps steps={euiSteps} />
              <EuiSpacer size="l" />
            </>
          )}

          {findings.length === 0 ? (
            <EuiCallOut
              title={i18n.translate(
                'xpack.alertingV2.ruleDoctor.executionDetail.noIssuesTitle',
                { defaultMessage: 'No issues found' }
              )}
              color="success"
              iconType="check"
            >
              <p>
                {i18n.translate(
                  'xpack.alertingV2.ruleDoctor.executionDetail.noIssuesBody',
                  {
                    defaultMessage:
                      'Rule Doctor analyzed your rules and found no optimization opportunities.',
                  }
                )}
              </p>
            </EuiCallOut>
          ) : (
            <>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.alertingV2.ruleDoctor.executionDetail.recommendationsTitle',
                    { defaultMessage: 'Recommendations' }
                  )}
                </h2>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.alertingV2.ruleDoctor.executionDetail.recommendationsSubtitle',
                    {
                      defaultMessage:
                        'Found {count} {count, plural, one {recommendation} other {recommendations}}.',
                      values: { count: findings.length },
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              {findings.map((finding) => (
                <React.Fragment key={finding.id}>
                  <FindingCard finding={finding} />
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
};
