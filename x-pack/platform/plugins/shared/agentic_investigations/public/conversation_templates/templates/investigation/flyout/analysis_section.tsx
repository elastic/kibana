/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { AttachmentSummaryRow } from '@kbn/agentic-investigations-common';
import type { Investigation } from '../../../../../common';
import {
  COMPONENT_DIAGRAM_LABEL,
  componentDiagramRowLabel,
} from '../../../../component_diagram/attachments/translations';
import { TIMELINE_LABEL, timelineRowLabel } from '../../../../timeline/attachments/translations';
import { TRACE_LABEL, traceRowLabel } from '../../../../trace/attachments/translations';

const LazyTimeline = React.lazy(() =>
  import('../../../../timeline/attachments/timeline_view').then(({ TimelineEventsList }) => ({
    default: TimelineEventsList,
  }))
);
const LazyComponentDiagram = React.lazy(() =>
  import('../../../../component_diagram/attachments/component_diagram_view').then(
    ({ ComponentDiagramContent }) => ({ default: ComponentDiagramContent })
  )
);
const LazyTrace = React.lazy(() =>
  import('../../../../trace/attachments/trace_view').then(({ TraceStepsList }) => ({
    default: TraceStepsList,
  }))
);

type AnalysisArtifact = 'timeline' | 'component_diagram' | 'trace';

export type InvestigationAnalysis = Pick<Investigation, 'timeline' | 'component_diagram' | 'trace'>;

interface ArtifactRow {
  artifact: AnalysisArtifact;
  label: string;
  typeName: string;
  icon: IconType;
  render: () => React.ReactNode;
}

const toRows = ({
  timeline,
  component_diagram: diagram,
  trace,
}: InvestigationAnalysis): ArtifactRow[] => [
  ...(timeline && timeline.events.length > 0
    ? [
        {
          artifact: 'timeline' as const,
          label: timelineRowLabel(timeline.events.length),
          typeName: TIMELINE_LABEL,
          icon: 'calendar',
          render: () => <LazyTimeline events={timeline.events} variant="details" />,
        },
      ]
    : []),
  ...(diagram
    ? [
        {
          artifact: 'component_diagram' as const,
          label: componentDiagramRowLabel(diagram.title),
          typeName: COMPONENT_DIAGRAM_LABEL,
          icon: 'layers',
          render: () => (
            <LazyComponentDiagram
              diagram={{
                title: diagram.title,
                mermaid: diagram.mermaid,
                description: diagram.description,
                problemNodeIds: diagram.problem_node_ids,
              }}
              variant="details"
            />
          ),
        },
      ]
    : []),
  ...(trace && trace.steps.length > 0
    ? [
        {
          artifact: 'trace' as const,
          label: traceRowLabel(trace.steps.length),
          typeName: TRACE_LABEL,
          icon: 'branch',
          render: () => (
            <LazyTrace steps={trace.steps} decisionTree={trace.decision_tree} variant="details" />
          ),
        },
      ]
    : []),
];

/** True when the investigation has an analysis artifact the section would list. */
export const hasAnalysis = (analysis: InvestigationAnalysis): boolean =>
  toRows(analysis).length > 0;

const ArtifactFlyout = ({ row, onClose }: { row: ArtifactRow; onClose: () => void }) => {
  const titleId = useGeneratedHtmlId({ prefix: 'investigationAnalysisFlyoutTitle' });
  return (
    <EuiFlyout
      session="inherit"
      onClose={onClose}
      size="m"
      type="push"
      aria-labelledby={titleId}
      flyoutMenuProps={{ title: row.typeName }}
      data-test-subj={`investigationAnalysisFlyout-${row.artifact}`}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{row.label}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Suspense fallback={<EuiLoadingSpinner size="l" />}>{row.render()}</Suspense>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

/**
 * The investigation's timeline, component diagram, and trace as one row each; a row opens its
 * artifact in a nested flyout next to the details flyout.
 */
export const AnalysisSection: React.FC<{ analysis: InvestigationAnalysis }> = ({ analysis }) => {
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = useState<AnalysisArtifact | undefined>();
  const rows = toRows(analysis);
  const openRow = rows.find(({ artifact }) => artifact === open);

  return (
    <>
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        css={css({ borderRadius: euiTheme.size.s, overflow: 'hidden' })}
        data-test-subj="investigationAnalysis"
      >
        <EuiFlexGroup
          component="ul"
          direction="column"
          gutterSize="none"
          responsive={false}
          css={css({
            margin: 0,
            padding: 0,
            listStyle: 'none',
            '& > li + li': { borderTop: euiTheme.border.thin },
          })}
        >
          {rows.map(({ artifact, label, typeName, icon }) => (
            <AttachmentSummaryRow
              key={artifact}
              label={label}
              typeName={typeName}
              iconType={icon}
              onClick={() => setOpen(artifact)}
            />
          ))}
        </EuiFlexGroup>
      </EuiPanel>
      {openRow && <ArtifactFlyout row={openRow} onClose={() => setOpen(undefined)} />}
    </>
  );
};
