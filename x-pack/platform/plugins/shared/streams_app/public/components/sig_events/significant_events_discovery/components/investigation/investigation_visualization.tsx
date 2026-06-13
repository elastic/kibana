/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationResult } from '@kbn/streams-schema';

type InvestigationData = InvestigationResult;

const confidenceColor = (confidence: number): 'success' | 'warning' | 'danger' => {
  if (confidence >= 0.7) return 'success';
  if (confidence >= 0.4) return 'warning';
  return 'danger';
};

const verdictColor = (
  verdict: string
): 'success' | 'warning' | 'danger' | 'default' | 'primary' => {
  switch (verdict) {
    case 'supported':
      return 'success';
    case 'refuted':
      return 'danger';
    case 'inconclusive':
      return 'warning';
    case 'out_of_reach':
      return 'default';
    default:
      return 'default';
  }
};

const verdictLabel = (verdict: string): string => {
  switch (verdict) {
    case 'supported':
      return i18n.translate('xpack.streams.investigation.verdict.supported', {
        defaultMessage: 'Supported',
      });
    case 'refuted':
      return i18n.translate('xpack.streams.investigation.verdict.refuted', {
        defaultMessage: 'Refuted',
      });
    case 'inconclusive':
      return i18n.translate('xpack.streams.investigation.verdict.inconclusive', {
        defaultMessage: 'Inconclusive',
      });
    case 'out_of_reach':
      return i18n.translate('xpack.streams.investigation.verdict.outOfReach', {
        defaultMessage: 'Out of reach',
      });
    default:
      return verdict;
  }
};

const riskLevelColor = (risk: string): 'success' | 'warning' | 'danger' => {
  switch (risk) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'danger';
    default:
      return 'warning';
  }
};

interface InvestigationVisualizationProps {
  investigation: InvestigationData;
}

export const InvestigationVisualization = ({ investigation }: InvestigationVisualizationProps) => {
  const discardedAccordionId = useGeneratedHtmlId();
  const remediationAccordionId = useGeneratedHtmlId();
  const gapsAccordionId = useGeneratedHtmlId();

  return (
    <div>
      {!investigation.investigation_complete && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            title={i18n.translate('xpack.streams.investigation.incompleteTitle', {
              defaultMessage: 'Investigation incomplete — access gaps blocked full analysis',
            })}
            color="warning"
            iconType="warning"
          />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={confidenceColor(investigation.confidence)}>
            {i18n.translate('xpack.streams.investigation.confidenceLabel', {
              defaultMessage: 'Confidence: {pct}%',
              values: { pct: Math.round(investigation.confidence * 100) },
            })}
          </EuiHealth>
        </EuiFlexItem>
        {investigation.investigation_complete && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">
              {i18n.translate('xpack.streams.investigation.completeLabel', {
                defaultMessage: 'Complete',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.investigation.rootCauseLabel', {
            defaultMessage: 'Root Cause',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s">{investigation.root_cause}</EuiText>

      {investigation.impact && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <strong>
              {i18n.translate('xpack.streams.investigation.impactLabel', {
                defaultMessage: 'Impact:',
              })}
            </strong>{' '}
            {investigation.impact}
          </EuiText>
        </>
      )}

      {investigation.ranked_hypotheses.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.streams.investigation.hypothesesLabel', {
                defaultMessage: 'Investigated Hypotheses',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {investigation.ranked_hypotheses.map((hyp) => (
            <div key={hyp.hypothesis_id}>
              <EuiPanel paddingSize="s" hasBorder>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">#{hyp.rank}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      wrap
                      responsive={false}
                      justifyContent="spaceBetween"
                    >
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{hyp.statement}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiBadge color={verdictColor(hyp.verdict)}>
                              {verdictLabel(hyp.verdict)}
                            </EuiBadge>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiToolTip
                              content={i18n.translate(
                                'xpack.streams.investigation.posteriorConfidenceTooltip',
                                {
                                  defaultMessage: 'Posterior confidence after evidence review',
                                }
                              )}
                            >
                              <EuiBadge
                                color={confidenceColor(hyp.posterior_confidence)}
                              >{`${Math.round(hyp.posterior_confidence * 100)}%`}</EuiBadge>
                            </EuiToolTip>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {hyp.evidence_summary && (
                      <>
                        <EuiSpacer size="xs" />
                        <EuiText size="xs" color="subdued">
                          {hyp.evidence_summary}
                        </EuiText>
                      </>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </div>
          ))}
        </>
      )}

      {investigation.discarded_hypotheses.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={discardedAccordionId}
            buttonContent={i18n.translate('xpack.streams.investigation.discardedLabel', {
              defaultMessage: 'Discarded hypotheses ({count})',
              values: { count: investigation.discarded_hypotheses.length },
            })}
          >
            <EuiSpacer size="s" />
            {investigation.discarded_hypotheses.map((hyp) => (
              <div key={hyp.hypothesis_id}>
                <EuiPanel paddingSize="s" hasBorder color="subdued">
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="default">
                        {i18n.translate('xpack.streams.investigation.discardedBadge', {
                          defaultMessage: 'Discarded',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        <strong>{hyp.statement}</strong>
                      </EuiText>
                      {hyp.discard_reason && (
                        <>
                          <EuiSpacer size="xs" />
                          <EuiText size="xs" color="subdued">
                            {hyp.discard_reason}
                          </EuiText>
                        </>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="xs" />
              </div>
            ))}
          </EuiAccordion>
        </>
      )}

      {investigation.remediation_options.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id={remediationAccordionId}
            buttonContent={i18n.translate('xpack.streams.investigation.remediationLabel', {
              defaultMessage: 'Remediation options ({count})',
              values: { count: investigation.remediation_options.length },
            })}
            initialIsOpen
          >
            <EuiSpacer size="s" />
            {investigation.remediation_options.map((opt) => (
              <div key={opt.rank}>
                <EuiPanel paddingSize="s" hasBorder>
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">#{opt.rank}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        wrap
                        responsive={false}
                        justifyContent="spaceBetween"
                      >
                        <EuiFlexItem>
                          <EuiText size="s">
                            <strong>{opt.action}</strong>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={riskLevelColor(opt.risk_level)}>
                            {i18n.translate('xpack.streams.investigation.riskLabel', {
                              defaultMessage: '{level} risk',
                              values: { level: opt.risk_level },
                            })}
                          </EuiBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      {opt.rationale && (
                        <>
                          <EuiSpacer size="xs" />
                          <EuiText size="xs" color="subdued">
                            {opt.rationale}
                          </EuiText>
                        </>
                      )}
                      {opt.prerequisites && opt.prerequisites.length > 0 && (
                        <>
                          <EuiSpacer size="xs" />
                          <EuiText size="xs" color="subdued">
                            <em>
                              {i18n.translate('xpack.streams.investigation.prerequisitesLabel', {
                                defaultMessage: 'Prerequisites: {prereqs}',
                                values: { prereqs: opt.prerequisites.join(', ') },
                              })}
                            </em>
                          </EuiText>
                        </>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="xs" />
              </div>
            ))}
          </EuiAccordion>
        </>
      )}

      {investigation.gaps_found.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id={gapsAccordionId}
            buttonContent={i18n.translate('xpack.streams.investigation.gapsLabel', {
              defaultMessage: 'Access gaps ({count})',
              values: { count: investigation.gaps_found.length },
            })}
          >
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              iconType="warning"
              title={i18n.translate('xpack.streams.investigation.gapsTitle', {
                defaultMessage:
                  'The following gaps limited the investigation. Connect these sources for more complete analysis.',
              })}
            >
              <ul>
                {investigation.gaps_found.map((gap, i) => (
                  <li key={i}>
                    <EuiText size="s">{gap}</EuiText>
                  </li>
                ))}
              </ul>
            </EuiCallOut>
          </EuiAccordion>
        </>
      )}
    </div>
  );
};
