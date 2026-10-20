/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InvestigationEvidence } from '../../common/evidence';
import { EvidenceChart } from './evidence_chart';
import { EvidenceReferences } from './evidence_references';
import { EVIDENCE_LABEL } from './translations';

export interface EvidenceViewProps {
  evidence: InvestigationEvidence;
  /** Frame the chart in a bordered panel. Off when the evidence already sits inside one. */
  outlineChart?: boolean;
}

/**
 * One piece of investigation evidence, collapsed by default: its static chart, when it has one,
 * its Markdown description, and the links and queries that let the user verify it. Renders the same whether the data was local or fetched remotely.
 */
export const EvidenceView: React.FC<EvidenceViewProps> = ({
  evidence: { description, chart, references = [] },
  outlineChart = true,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationEvidence' });
  const hasDescription = Boolean(description?.trim());
  const hasReferences = references.length > 0;
  if (!chart && !hasDescription && !hasReferences) {
    return null;
  }
  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={EVIDENCE_LABEL}
      buttonProps={{ css: { fontWeight: 600 } }}
      paddingSize="s"
      data-test-subj="investigationEvidence"
    >
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
          {(chart || hasDescription) && <EuiSpacer size="s" />}
          <EvidenceReferences references={references} />
        </>
      )}
    </EuiAccordion>
  );
};
