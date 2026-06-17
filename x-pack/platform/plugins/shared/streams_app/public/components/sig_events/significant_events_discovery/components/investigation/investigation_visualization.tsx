/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationResult } from '@kbn/streams-schema';
import { useSynthesizeWithFeedback } from '../memory/use_memory';

type InvestigationData = InvestigationResult;

const confidenceColor = (confidence: number): 'success' | 'warning' | 'danger' => {
  if (confidence >= 0.7) return 'success';
  if (confidence >= 0.4) return 'warning';
  return 'danger';
};

interface FeedbackButtonsProps {
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  disabled?: boolean;
}

const FeedbackButtons = ({ onThumbsUp, onThumbsDown, disabled }: FeedbackButtonsProps) => {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  if (voted) {
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.investigation.feedback.thankyou', {
          defaultMessage: 'Thanks!',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbsUp"
          size="xs"
          aria-label={i18n.translate('xpack.streams.investigation.feedback.correct', {
            defaultMessage: 'Correct',
          })}
          disabled={disabled}
          onClick={() => {
            setVoted('up');
            onThumbsUp();
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="thumbsDown"
          size="xs"
          aria-label={i18n.translate('xpack.streams.investigation.feedback.incorrect', {
            defaultMessage: 'Incorrect',
          })}
          disabled={disabled}
          onClick={() => {
            setVoted('down');
            onThumbsDown();
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
  const alternativesAccordionId = useGeneratedHtmlId();
  const gapsAccordionId = useGeneratedHtmlId();
  const { mutate: sendFeedback } = useSynthesizeWithFeedback();

  const canFeedback = !!discoveryId;

  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={confidenceColor(investigation.confidence)}>
            {i18n.translate('xpack.streams.investigation.confidenceLabel', {
              defaultMessage: 'Confidence: {pct}%',
              values: { pct: Math.round(investigation.confidence * 100) },
            })}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.streams.investigation.rootCauseLabel', {
                defaultMessage: 'Root Cause',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {canFeedback && (
          <EuiFlexItem grow={false}>
            <FeedbackButtons
              onThumbsUp={() =>
                sendFeedback({ aspect: 'root_cause', feedback: 'correct', discovery_id: discoveryId })
              }
              onThumbsDown={() =>
                sendFeedback({ aspect: 'root_cause', feedback: 'incorrect', discovery_id: discoveryId })
              }
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s">{investigation.root_cause}</EuiText>

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <strong>
          {i18n.translate('xpack.streams.investigation.mechanismLabel', {
            defaultMessage: 'Mechanism:',
          })}
        </strong>{' '}
        {investigation.mechanism}
      </EuiText>

      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.investigation.evidenceLabel', {
            defaultMessage: 'Supporting Evidence',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s">{investigation.evidence_summary}</EuiText>

      {investigation.alternatives_ruled_out.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id={alternativesAccordionId}
            buttonContent={i18n.translate('xpack.streams.investigation.alternativesLabel', {
              defaultMessage: 'Alternatives ruled out ({count})',
              values: { count: investigation.alternatives_ruled_out.length },
            })}
          >
            <EuiSpacer size="s" />
            {investigation.alternatives_ruled_out.map((alt, i) => (
              <div key={i}>
                <EuiPanel paddingSize="s" hasBorder color="subdued">
                  <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="s" color="subdued">
                        <strong>{alt.candidate}</strong>
                        {' — '}
                        {alt.reason}
                      </EuiText>
                    </EuiFlexItem>
                    {canFeedback && (
                      <EuiFlexItem grow={false}>
                        <FeedbackButtons
                          onThumbsUp={() =>
                            sendFeedback({
                              aspect: 'alternative',
                              feedback: 'correct',
                              discovery_id: discoveryId,
                              alternative_candidate: alt.candidate,
                            })
                          }
                          onThumbsDown={() =>
                            sendFeedback({
                              aspect: 'alternative',
                              feedback: 'incorrect',
                              discovery_id: discoveryId,
                              alternative_candidate: alt.candidate,
                            })
                          }
                        />
                      </EuiFlexItem>
                    )}
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
