/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiMarkdownFormat, EuiPanel, EuiSpacer } from '@elastic/eui';
import type { InvestigationEvidence } from '../../common/evidence';
import { EvidenceChart } from './evidence_chart';

export interface EvidenceViewProps {
  evidence: InvestigationEvidence;
  /** Frame the chart in a bordered panel. Off when the evidence already sits inside one. */
  outlineChart?: boolean;
}

/**
 * One piece of investigation evidence: its static chart, when it has one, followed by its
 * Markdown description. Renders the same whether the data was local or fetched remotely.
 */
export const EvidenceView: React.FC<EvidenceViewProps> = ({
  evidence: { description, chart },
  outlineChart = true,
}) => {
  const hasDescription = Boolean(description?.trim());
  if (!chart && !hasDescription) {
    return null;
  }
  return (
    <div data-test-subj="investigationEvidence">
      {chart &&
        (outlineChart ? (
          <EuiPanel hasBorder hasShadow={false} paddingSize="s">
            <EvidenceChart chart={chart} />
          </EuiPanel>
        ) : (
          <EvidenceChart chart={chart} />
        ))}
      {chart && hasDescription && <EuiSpacer size="s" />}
      {hasDescription && <EuiMarkdownFormat textSize="s">{description ?? ''}</EuiMarkdownFormat>}
    </div>
  );
};
