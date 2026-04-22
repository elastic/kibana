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
  EuiPagination,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FindingCard } from './finding_card';
import { isValidFinding } from './types';
import type { RuleDoctorFinding } from './types';
import { useFetchFindings } from '../../hooks/use_fetch_findings';
import type { FindingDoc, FindingStatus } from '../../services/rule_doctor_api';

const toFinding = (doc: FindingDoc): RuleDoctorFinding => ({
  id: doc.finding_id,
  type: doc.type,
  action: doc.action,
  impact: doc.impact,
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

const PAGE_SIZE = 10;

export const OverviewTab: React.FC<OverviewTabProps> = ({ onSwitchToExecutions }) => {
  const [status, setStatus] = useState<FindingStatus>('open');
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } = useFetchFindings(status);

  const findings = useMemo(
    () =>
      (data?.findings ?? [])
        .map(toFinding)
        .filter(isValidFinding)
        .filter((f) => f.confidence !== 'low'),
    [data]
  );
  const analyzedAt = data?.findings?.[0]?.['@timestamp'] ?? null;
  const pageCount = Math.ceil(findings.length / PAGE_SIZE);
  const paginatedFindings = findings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStatusChange = (id: string) => {
    setStatus(id as FindingStatus);
    setPage(0);
  };

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

  const renderBody = () => {
    if (isLoading) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" direction="column">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.alertingV2.ruleDoctor.overview.loadingTitle', {
                defaultMessage: 'Loading recommendations...',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
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

    const rangeStart = page * PAGE_SIZE + 1;
    const rangeEnd = Math.min((page + 1) * PAGE_SIZE, findings.length);

    return (
      <>
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.alertingV2.ruleDoctor.overview.showingLabel"
            defaultMessage="Showing {rangeBold} of {totalBold}"
            values={{
              rangeBold: (
                <strong>
                  {rangeStart}-{rangeEnd}
                </strong>
              ),
              totalBold: (
                <strong>
                  <FormattedMessage
                    id="xpack.alertingV2.ruleDoctor.overview.showingLabelTotal"
                    defaultMessage="{total} {total, plural, one {Recommendation} other {Recommendations}}"
                    values={{ total: findings.length }}
                  />
                </strong>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="m" />
        {paginatedFindings.map((finding) => (
          <React.Fragment key={finding.id}>
            <FindingCard
              finding={finding}
              analyzedAt={analyzedAt}
              showActions={status === 'open'}
            />
            <EuiSpacer size="m" />
          </React.Fragment>
        ))}
        {pageCount > 1 && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiPagination
                pageCount={pageCount}
                activePage={page}
                onPageClick={setPage}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    );
  };

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.alertingV2.ruleDoctor.overview.statusFilterLegend',
              { defaultMessage: 'Filter by status' }
            )}
            options={STATUS_OPTIONS}
            idSelected={status}
            onChange={handleStatusChange}
            buttonSize="compressed"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {renderBody()}
    </>
  );

};
