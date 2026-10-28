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
import { EvidenceReferences } from './evidence_references';

export interface EvidenceViewProps {
  evidence: InvestigationEvidence;
  /** Frame the chart in a bordered panel. Off when the evidence already sits inside one. */
  outlineChart?: boolean;
}

/**
 * One piece of investigation evidence: its static chart, when it has one, followed by its
 * Markdown description and a collapsed list of the links and queries behind it. Renders the same
 * whether the data was local or fetched remotely.
 */
export const EvidenceView: React.FC<EvidenceViewProps> = ({
  evidence: { description, chart, references = [] },
  outlineChart = true,
}) => {
  const hasDescription = Boolean(description?.trim());
  const hasReferences = references.length > 0;
  if (!chart && !hasDescription && !hasReferences) {
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
      {hasReferences && (
        <>
          {(chart || hasDescription) && <EuiSpacer size="m" />}
          <EvidenceReferences references={references} />
        </>
      )}
    </div>
  );
};
