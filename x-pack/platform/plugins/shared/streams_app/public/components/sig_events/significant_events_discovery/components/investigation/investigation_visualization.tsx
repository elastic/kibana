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
  EuiButtonIcon,
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
import { useKibana } from '../../../../../hooks/use_kibana';
import { useSynthesizeWithFeedback } from '../memory/use_memory';
import type { InvestigationFeedbackPayload } from '../memory/use_memory';

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

const InvestigationFeedbackButtons = ({
  onFeedback,
  positiveLabel,
  negativeLabel,
  positiveValue,
  negativeValue,
  testSubjPrefix,
}: {
  onFeedback: (v: 'correct' | 'incorrect' | 'helpful' | 'not_helpful') => void;
  positiveLabel: string;
  negativeLabel: string;
  positiveValue: 'correct' | 'helpful';
  negativeValue: 'incorrect' | 'not_helpful';
  testSubjPrefix: string;
}) => {
  const [reacted, setReacted] = React.useState(false);

  if (reacted) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.streams.investigation.thankYou', { defaultMessage: 'Thank you!' })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbUp"
          aria-label={positiveLabel}
          color="success"
          data-test-subj={`${testSubjPrefix}_positive`}
          onClick={() => {
            onFeedback(positiveValue);
            setReacted(true);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbDown"
          aria-label={negativeLabel}
          color="danger"
          data-test-subj={`${testSubjPrefix}_negative`}
          onClick={() => {
            onFeedback(negativeValue);
            setReacted(true);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface InvestigationVisualizationProps {
  investigation: InvestigationData;
  discoveryId?: string;
}

export const InvestigationVisualization = ({
  investigation,
  discoveryId,
}: InvestigationVisualizationProps) => {
  const {
    services: { telemetryClient },
  } = useKibana();
  const synthesizeWithFeedback = useSynthesizeWithFeedback();

  const handleFeedback = (payload: Omit<InvestigationFeedbackPayload, 'discovery_id'>) => {
    if (!discoveryId) return;
    const full = { ...payload, discovery_id: discoveryId };
    telemetryClient.trackInvestigationFeedback(full);
    synthesizeWithFeedback.mutate(full);
  };
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
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiText size="s">{investigation.root_cause}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {discoveryId && (
            <InvestigationFeedbackButtons
              onFeedback={(v) =>
                handleFeedback({ aspect: 'root_cause', feedback: v as 'correct' | 'incorrect' })
              }
              positiveLabel={i18n.translate('xpack.streams.investigation.rootCauseCorrect', {
                defaultMessage: 'Root cause is correct',
              })}
              negativeLabel={i18n.translate('xpack.streams.investigation.rootCauseIncorrect', {
                defaultMessage: 'Root cause is incorrect',
              })}
              positiveValue="correct"
              negativeValue="incorrect"
              testSubjPrefix="investigation_root_cause_feedback"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

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
                    {discoveryId && (
                      <>
                        <EuiSpacer size="xs" />
                        <InvestigationFeedbackButtons
                          onFeedback={(v) =>
                            handleFeedback({
                              aspect: 'hypothesis',
                              feedback: v as 'correct' | 'incorrect',
                              hypothesis_id: hyp.hypothesis_id,
                            })
                          }
                          positiveLabel={i18n.translate(
                            'xpack.streams.investigation.hypothesisAgrees',
                            { defaultMessage: 'Verdict agrees with what I observed' }
                          )}
                          negativeLabel={i18n.translate(
                            'xpack.streams.investigation.hypothesisDisagrees',
                            { defaultMessage: 'Verdict disagrees with what I observed' }
                          )}
                          positiveValue="correct"
                          negativeValue="incorrect"
                          testSubjPrefix={`investigation_hypothesis_${hyp.hypothesis_id}_feedback`}
                        />
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
                      {discoveryId && (
                        <>
                          <EuiSpacer size="xs" />
                          <InvestigationFeedbackButtons
                            onFeedback={(v) =>
                              handleFeedback({
                                aspect: 'remediation',
                                feedback: v as 'helpful' | 'not_helpful',
                                remediation_rank: opt.rank,
                              })
                            }
                            positiveLabel={i18n.translate(
                              'xpack.streams.investigation.remediationHelpful',
                              { defaultMessage: 'This remediation is applicable' }
                            )}
                            negativeLabel={i18n.translate(
                              'xpack.streams.investigation.remediationNotHelpful',
                              { defaultMessage: 'This remediation is not applicable' }
                            )}
                            positiveValue="helpful"
                            negativeValue="not_helpful"
                            testSubjPrefix={`investigation_remediation_${opt.rank}_feedback`}
                          />
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
