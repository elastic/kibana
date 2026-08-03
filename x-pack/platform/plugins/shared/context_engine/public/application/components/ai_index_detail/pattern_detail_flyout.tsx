/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { Pattern } from '../../../../common/http_api/patterns';
import { usePatternCases } from '../../hooks/use_pattern_cases';
import { useProposeImprovement } from '../../hooks/use_propose_improvement';
import { CaseDetailFlyout } from './case_detail_flyout';
import { patternSummary, patternTarget, patternTitle } from './pattern_format';

interface PatternDetailFlyoutProps {
  aiIndexId: string;
  aiIndex: GetAiIndexResponse | undefined;
  pattern: Pattern;
  onClose: () => void;
}

const statusBadgeColor = (status?: string): 'danger' | 'success' | 'default' =>
  status === 'Error' ? 'danger' : status === 'Ok' ? 'success' : 'default';

const round = (value?: number, digits = 2): string | undefined =>
  typeof value === 'number' ? value.toFixed(digits).replace(/\.?0+$/, '') : undefined;

/**
 * The pattern "issue" view: a formal summary of a detected failure mode — what
 * the classifier found, the aggregate evidence, and the member cases. Clicking a
 * case opens the case detail + trace waterfall on top (see {@link CaseDetailFlyout}).
 */
export const PatternDetailFlyout = ({
  aiIndexId,
  aiIndex,
  pattern,
  onClose,
}: PatternDetailFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'ctxPatternFlyout' });
  const { cases, isLoading } = usePatternCases(aiIndexId, pattern.pattern_key, true);
  const { proposeImprovement, isAvailable } = useProposeImprovement();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const target = patternTarget(pattern);
  const ev = pattern.evidence ?? {};
  const parts = pattern.partitions ?? {};

  const representativeTraceIds = cases.length
    ? cases.map((traceCase) => traceCase.round_id)
    : pattern.evidence?.representative_case_ids ?? [];

  const evidenceItems: EuiDescriptionListProps['listItems'] = [
    { title: labels.caseCount, description: String(ev.case_count ?? 0) },
    ...(ev.frequency != null
      ? [{ title: labels.frequency, description: round(ev.frequency)! }]
      : []),
    ...(ev.confidence != null
      ? [{ title: labels.confidence, description: round(ev.confidence)! }]
      : []),
    ...(ev.impact ? [{ title: labels.impact, description: ev.impact }] : []),
    ...(ev.first_seen ? [{ title: labels.firstSeen, description: ev.first_seen }] : []),
    ...(ev.last_seen ? [{ title: labels.lastSeen, description: ev.last_seen }] : []),
    {
      title: labels.partitions,
      description: `dev ${parts.dev_count ?? 0} · eval ${parts.eval_count ?? 0} · regression ${
        parts.regression_count ?? 0
      }`,
    },
  ];

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-labelledby={flyoutTitleId}
        data-test-subj="contextPatternDetailFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{patternTitle(pattern)}</h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color={pattern.status === 'resolved' ? 'success' : 'default'}>
                {pattern.status}
              </EuiBadge>
            </EuiFlexItem>
            {target && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{target}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {isAvailable && (
            <>
              <EuiSpacer size="m" />
              <EuiButton
                size="s"
                fill
                iconType="wrench"
                onClick={() => proposeImprovement(pattern, representativeTraceIds)}
                data-test-subj="contextProposeImprovementButton"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.patterns.proposeImprovement"
                  defaultMessage="Propose improvement"
                />
              </EuiButton>
            </>
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCallOut
            size="s"
            iconType="inspect"
            title={i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.summaryTitle', {
              defaultMessage: 'What we found',
            })}
            data-test-subj="contextPatternSummary"
          >
            <p>{patternSummary(pattern)}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />

          <EuiTitle size="xs">
            <h3>{labels.evidenceSection}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            columnWidths={[1, 2]}
            compressed
            listItems={evidenceItems}
          />

          <EuiHorizontalRule margin="m" />

          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.casesSection', {
                    defaultMessage: 'Cases ({count})',
                    values: { count: ev.case_count ?? cases.length },
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            {cases.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="apmTrace"
                  onClick={() => setSelectedIndex(0)}
                  data-test-subj="contextViewAllCasesButton"
                >
                  <FormattedMessage
                    id="xpack.contextEngine.aiIndexDetail.patternDetail.viewAllCases"
                    defaultMessage="View all cases"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.patternDetail.casesHint"
              defaultMessage="Each case is one retrieval event. Open one to see its agent trace as a waterfall — use Next / Previous to step through the suite."
            />
          </EuiText>
          <EuiSpacer size="s" />

          {isLoading ? (
            <EuiSkeletonText lines={3} />
          ) : cases.length === 0 ? (
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.noCases', {
                defaultMessage: 'No cases for this pattern.',
              })}
            </EuiText>
          ) : (
            cases.map((traceCase, index) => (
              <React.Fragment key={traceCase.case_id}>
                <EuiPanel
                  paddingSize="s"
                  hasShadow={false}
                  hasBorder
                  onClick={() => setSelectedIndex(index)}
                  data-test-subj="contextPatternCaseRow"
                  aria-label={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.patternDetail.caseRowAriaLabel',
                    { defaultMessage: 'View case trace' }
                  )}
                >
                  <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                    <EuiFlexItem>
                      <EuiText size="xs">{traceCase['@timestamp']}</EuiText>
                      <EuiText size="xs" color="subdued">
                        {traceCase.tool}
                        {traceCase.target_index ? ` · ${traceCase.target_index}` : ''}
                      </EuiText>
                    </EuiFlexItem>
                    {traceCase.status && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={statusBadgeColor(traceCase.status)}>
                          {traceCase.status}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="apmTrace" color="subdued" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="xs" />
              </React.Fragment>
            ))
          )}
        </EuiFlyoutBody>
      </EuiFlyout>

      {selectedIndex !== null && cases[selectedIndex] && (
        <CaseDetailFlyout
          pattern={pattern}
          patternCase={cases[selectedIndex]}
          aiIndex={aiIndex}
          position={{ index: selectedIndex, total: cases.length }}
          onPrevious={selectedIndex > 0 ? () => setSelectedIndex(selectedIndex - 1) : undefined}
          onNext={
            selectedIndex < cases.length - 1 ? () => setSelectedIndex(selectedIndex + 1) : undefined
          }
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
};

const labels = {
  evidenceSection: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.patternDetail.evidenceSection',
    {
      defaultMessage: 'Evidence',
    }
  ),
  caseCount: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.caseCount', {
    defaultMessage: 'Cases',
  }),
  frequency: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.frequency', {
    defaultMessage: 'Frequency',
  }),
  confidence: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.confidence', {
    defaultMessage: 'Confidence',
  }),
  impact: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.impact', {
    defaultMessage: 'Impact',
  }),
  firstSeen: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.firstSeen', {
    defaultMessage: 'First seen',
  }),
  lastSeen: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.lastSeen', {
    defaultMessage: 'Last seen',
  }),
  partitions: i18n.translate('xpack.contextEngine.aiIndexDetail.patternDetail.partitions', {
    defaultMessage: 'Partitions',
  }),
};
