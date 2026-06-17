/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
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

type InvestigationData = InvestigationResult;

const confidenceColor = (confidence: number): 'success' | 'warning' | 'danger' => {
  if (confidence >= 0.7) return 'success';
  if (confidence >= 0.4) return 'warning';
  return 'danger';
};

interface InvestigationVisualizationProps {
  investigation: InvestigationData;
}

export const InvestigationVisualization = ({ investigation }: InvestigationVisualizationProps) => {
  const alternativesAccordionId = useGeneratedHtmlId();
  const gapsAccordionId = useGeneratedHtmlId();

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

      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.investigation.rootCauseLabel', {
            defaultMessage: 'Root Cause',
          })}
        </h4>
      </EuiTitle>
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
                  <EuiText size="s" color="subdued">
                    <strong>{alt.candidate}</strong>
                    {' — '}
                    {alt.reason}
                  </EuiText>
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
