/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { OverviewTab } from './overview_tab';
import { ExecutionsTab } from './executions_tab';
import { useFetchRuleDoctorSettings } from '../../hooks/use_fetch_rule_doctor_settings';
import { useEnableRuleDoctor } from '../../hooks/use_enable_rule_doctor';
import { useRunAnalysis } from '../../hooks/use_run_analysis';
import { useExecutionStream } from '../../hooks/use_execution_stream';

type TabId = 'overview' | 'executions';

export const RuleDoctorPage = () => {
  const http = useService(CoreStart('http'));
  const history = useHistory();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [seedState, setSeedState] = useState<'idle' | 'seeding' | 'done' | 'error'>('idle');

  const { data: settings, isLoading: isLoadingSettings } = useFetchRuleDoctorSettings();
  const enableMutation = useEnableRuleDoctor();
  const runAnalysisMutation = useRunAnalysis();
  const executionStream = useExecutionStream();

  const seedRules = useCallback(async () => {
    setSeedState('seeding');
    try {
      await http.post('/internal/alerting/v2/rule_doctor/_seed');
      setSeedState('done');
    } catch {
      setSeedState('error');
    }
  }, [http]);

  const handleRunAnalysis = useCallback(() => {
    runAnalysisMutation.mutate(undefined, {
      onSuccess: () => {
        executionStream.reconnect();
        setActiveTab('executions');
      },
    });
  }, [runAnalysisMutation, executionStream]);

  const switchToExecutions = useCallback(() => {
    setActiveTab('executions');
  }, []);

  if (isLoadingSettings) {
    return <EuiLoadingSpinner size="xl" />;
  }

  const isEnabled = settings?.scheduleEnabled === true;

  if (!isEnabled) {
    return (
      <EuiEmptyPrompt
        iconType="inspect"
        title={
          <h2>
            {i18n.translate('xpack.alertingV2.ruleDoctor.enablePromptTitle', {
              defaultMessage: 'Enable Rule Doctor',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.alertingV2.ruleDoctor.enablePromptBody', {
              defaultMessage:
                'Rule Doctor provides AI-powered analysis of your rules to detect duplicates, threshold drift, coverage gaps, and stale configurations. Enable it for this space to get started.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            fill
            color="primary"
            onClick={() => enableMutation.mutate()}
            isLoading={enableMutation.isLoading}
            key="enable"
          >
            {i18n.translate('xpack.alertingV2.ruleDoctor.enableButton', {
              defaultMessage: 'Enable Rule Doctor',
            })}
          </EuiButton>,
        ]}
      />
    );
  }

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.alertingV2.ruleDoctor.pageTitle', {
          defaultMessage: 'Rule Doctor',
        })}
        description={i18n.translate('xpack.alertingV2.ruleDoctor.pageDescription', {
          defaultMessage:
            'AI-powered rule health monitoring. Detect threshold drift, coverage gaps, duplicate rules, and stale configurations.',
        })}
        rightSideItems={[
          <EuiFlexGroup gutterSize="s" alignItems="center" key="actions">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="base"
                iconType="gear"
                size="m"
                aria-label={i18n.translate('xpack.alertingV2.ruleDoctor.settingsButton', {
                  defaultMessage: 'Rule Doctor settings',
                })}
                onClick={() => history.push('/doctor/settings')}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="text"
                onClick={seedRules}
                isLoading={seedState === 'seeding'}
                isDisabled={seedState === 'done'}
              >
                {seedState === 'done'
                  ? i18n.translate('xpack.alertingV2.ruleDoctor.seedDone', {
                      defaultMessage: 'Rules seeded',
                    })
                  : i18n.translate('xpack.alertingV2.ruleDoctor.seedButton', {
                      defaultMessage: 'Seed test rules',
                    })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                iconType="playFilled"
                onClick={handleRunAnalysis}
                isLoading={runAnalysisMutation.isLoading}
              >
                {i18n.translate('xpack.alertingV2.ruleDoctor.runAnalysisButton', {
                  defaultMessage: 'Run analysis',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
        tabs={[
          {
            id: 'overview',
            label: i18n.translate('xpack.alertingV2.ruleDoctor.tabs.overview', {
              defaultMessage: 'Overview',
            }),
            isSelected: activeTab === 'overview',
            onClick: () => setActiveTab('overview'),
          },
          {
            id: 'executions',
            label: i18n.translate('xpack.alertingV2.ruleDoctor.tabs.executions', {
              defaultMessage: 'Executions',
            }),
            isSelected: activeTab === 'executions',
            onClick: () => setActiveTab('executions'),
          },
        ]}
      />
      <EuiSpacer size="m" />

      {activeTab === 'overview' && <OverviewTab onSwitchToExecutions={switchToExecutions} />}
      {activeTab === 'executions' && <ExecutionsTab executionStream={executionStream} />}
    </>
  );
};
