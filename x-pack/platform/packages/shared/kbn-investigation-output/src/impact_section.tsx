/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { InvestigationImpact } from '@kbn/significant-events-schema';
import { EvidenceItem } from './evidence_list';
import { EvidenceMarkdown } from './evidence_markdown';

export interface ImpactSectionProps {
  impact: InvestigationImpact;
}

/**
 * What the investigation found was affected: the impact narrative, then each impacted entity with
 * the evidence (usually a chart of its failure signal) that ties it to the incident.
 */
export const ImpactSection: React.FC<ImpactSectionProps> = ({ impact: { summary, entities } }) => {
  const hasSummary = Boolean(summary?.trim());
  if (!hasSummary && entities.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="investigationOutputImpact">
      {hasSummary && (
        <EvidenceMarkdown textSize="s" color="default">
          {summary ?? ''}
        </EvidenceMarkdown>
      )}
      {entities.length > 0 && (
        <>
          {hasSummary && <EuiSpacer size="s" />}
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {entities.map((entity, index) => (
              <EuiFlexItem
                key={`${entity.name}-${index}`}
                grow={false}
                data-test-subj="investigationOutputImpactEntity"
              >
                <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{entity.name}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    {entity.type && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{entity.type}</EuiBadge>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                  {entity.evidence && (
                    <>
                      <EuiSpacer size="xs" />
                      <EvidenceItem evidence={entity.evidence} />
                    </>
                  )}
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};
