/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FindingCard } from './finding_card';
import type { RuleDoctorFinding } from './types';
import { useFetchFindings } from '../../hooks/use_fetch_findings';
import type { FindingDoc, FindingStatus } from '../../services/rule_doctor_api';

const toFinding = (doc: FindingDoc): RuleDoctorFinding => ({
  id: doc.finding_id,
  type: doc.type,
  action: doc.action,
  risk: doc.risk,
  confidence: doc.confidence,
  summary: doc.summary,
  explanation: doc.explanation,
  ruleIds: doc.rule_ids,
  details: doc.details ?? {},
  current: doc.current ?? null,
  proposed: doc.proposed ?? null,
  diffs: doc.diffs ?? [],
});

const STATUS_OPTIONS = [
  {
    id: 'open' as const,
    label: i18n.translate('xpack.alertingV2.ruleDoctor.overview.statusOpen', {
      defaultMessage: 'Open',
    }),
  },
  {
    id: 'dismissed' as const,
    label: i18n.translate('xpack.alertingV2.ruleDoctor.overview.statusDismissed', {
      defaultMessage: 'Dismissed',
    }),
  },
];

interface OverviewTabProps {
  onSwitchToExecutions: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onSwitchToExecutions }) => {
  const [status, setStatus] = useState<FindingStatus>('open');
  const { data, isLoading, isError, error } = useFetchFindings(status);

  const findings = useMemo(
    () => (data?.findings ?? []).map(toFinding),
    [data]
  );
  const analyzedAt = data?.findings?.[0]?.['@timestamp'] ?? null;

  const renderEmptyState = () => {
    if (status === 'dismissed') {
      return (
        <EuiEmptyPrompt
          iconType="check"
          title={
            <h2>
              {i18n.translate('xpack.alertingV2.ruleDoctor.overview.noDismissedTitle', {
                defaultMessage: 'No dismissed recommendations',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.alertingV2.ruleDoctor.overview.noDismissedBody', {
                defaultMessage:
                  'Recommendations you dismiss will appear here for reference.',
              })}
            </p>
          }
        />
      );
    }

    return (
      <EuiEmptyPrompt
        iconType="inspect"
        title={
          <h2>
            {i18n.translate('xpack.alertingV2.ruleDoctor.overview.emptyTitle', {
              defaultMessage: 'No recommendations yet',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.alertingV2.ruleDoctor.overview.emptyBody', {
              defaultMessage:
                'Run an analysis from the Executions tab to get AI-powered recommendations for your rules.',
            })}
          </p>
        }
        actions={[
          <EuiFlexGroup justifyContent="center" key="go-to-executions">
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                color="accent"
                css={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={onSwitchToExecutions}
              >
                {i18n.translate('xpack.alertingV2.ruleDoctor.overview.goToExecutions', {
                  defaultMessage: 'Go to Executions',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.alertingV2.ruleDoctor.overview.loadingTitle', {
                defaultMessage: 'Loading recommendations...',
              })}
            </h2>
          }
        />
      );
    }

    if (isError) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.alertingV2.ruleDoctor.overview.errorTitle', {
            defaultMessage: 'Failed to load recommendations',
          })}
          color="danger"
          iconType="error"
        >
          <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </EuiCallOut>
      );
    }

    if (!data || data.findings.length === 0 || findings.length === 0) {
      return renderEmptyState();
    }

    return (
      <>
        <EuiTitle size="s">
          <h2>
            {status === 'open'
              ? i18n.translate('xpack.alertingV2.ruleDoctor.overview.recommendationsTitle', {
                  defaultMessage: 'AI Recommendations',
                })
              : i18n.translate(
                  'xpack.alertingV2.ruleDoctor.overview.dismissedRecommendationsTitle',
                  { defaultMessage: 'Dismissed Recommendations' }
                )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.alertingV2.ruleDoctor.overview.recommendationsSubtitle', {
              defaultMessage:
                'Agent Builder has analyzed your rules and found {count} {count, plural, one {recommendation} other {recommendations}}.',
              values: { count: findings.length },
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {findings.map((finding) => (
          <React.Fragment key={finding.id}>
            <FindingCard
              finding={finding}
              analyzedAt={analyzedAt}
              showActions={status === 'open'}
            />
            <EuiSpacer size="m" />
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.alertingV2.ruleDoctor.overview.statusFilterLegend', {
          defaultMessage: 'Filter by status',
        })}
        options={STATUS_OPTIONS}
        idSelected={status}
        onChange={(id) => setStatus(id as FindingStatus)}
        buttonSize="compressed"
      />
      <EuiSpacer size="m" />
      {renderContent()}
    </>
  );
};
