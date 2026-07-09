/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  InvestigationHypothesis,
  InvestigationNodeKind,
  InvestigationReference,
  InvestigationTreeNode,
} from '@kbn/significant-events-schema';
import { NodeChart } from './node_chart';
import { ReferenceChips } from './reference_chips';

const MARKER_SIZE = 28;

interface KindDisplay {
  icon: string;
  label: string;
  color: (euiTheme: UseEuiTheme['euiTheme']) => string;
  background: (euiTheme: UseEuiTheme['euiTheme']) => string;
}

const KIND_DISPLAY: Record<InvestigationNodeKind, KindDisplay> = {
  observation: {
    icon: 'eye',
    label: i18n.translate('xpack.investigationOutput.nodeKindObservationLabel', {
      defaultMessage: 'Observation',
    }),
    color: (t) => t.colors.primary,
    background: (t) => t.colors.backgroundBasePrimary,
  },
  hypothesis: {
    icon: 'bullseye',
    label: i18n.translate('xpack.investigationOutput.nodeKindHypothesisLabel', {
      defaultMessage: 'Hypothesis',
    }),
    color: (t) => t.colors.accent,
    background: (t) => t.colors.backgroundBaseAccent,
  },
  action: {
    icon: 'play',
    label: i18n.translate('xpack.investigationOutput.nodeKindActionLabel', {
      defaultMessage: 'Action',
    }),
    color: (t) => t.colors.textSubdued,
    background: (t) => t.colors.backgroundBaseSubdued,
  },
  evidence: {
    icon: 'document',
    label: i18n.translate('xpack.investigationOutput.nodeKindEvidenceLabel', {
      defaultMessage: 'Evidence',
    }),
    color: (t) => t.colors.primary,
    background: (t) => t.colors.backgroundBasePrimary,
  },
  decision: {
    icon: 'branch',
    label: i18n.translate('xpack.investigationOutput.nodeKindDecisionLabel', {
      defaultMessage: 'Decision',
    }),
    color: (t) => t.colors.warning,
    background: (t) => t.colors.backgroundBaseWarning,
  },
  dead_end: {
    icon: 'minusInCircle',
    label: i18n.translate('xpack.investigationOutput.nodeKindDeadEndLabel', {
      defaultMessage: 'Dead end',
    }),
    color: (t) => t.colors.textSubdued,
    background: (t) => t.colors.backgroundBaseSubdued,
  },
  conclusion: {
    icon: 'flag',
    label: i18n.translate('xpack.investigationOutput.nodeKindConclusionLabel', {
      defaultMessage: 'Conclusion',
    }),
    color: (t) => t.colors.success,
    background: (t) => t.colors.backgroundBaseSuccess,
  },
};

const STATUS_BADGE: Partial<
  Record<NonNullable<InvestigationTreeNode['status']>, { color: string; label: string }>
> = {
  confirmed: {
    color: 'success',
    label: i18n.translate('xpack.investigationOutput.nodeStatusConfirmedLabel', {
      defaultMessage: 'Confirmed',
    }),
  },
  dismissed: {
    color: 'default',
    label: i18n.translate('xpack.investigationOutput.nodeStatusDismissedLabel', {
      defaultMessage: 'Dismissed',
    }),
  },
  abandoned: {
    color: 'default',
    label: i18n.translate('xpack.investigationOutput.nodeStatusAbandonedLabel', {
      defaultMessage: 'Abandoned',
    }),
  },
  active: {
    color: 'accent',
    label: i18n.translate('xpack.investigationOutput.nodeStatusActiveLabel', {
      defaultMessage: 'In progress',
    }),
  },
};

const isSettledBranch = (status: InvestigationTreeNode['status']): boolean =>
  status === 'abandoned' || status === 'dismissed';

interface TreeShape {
  roots: InvestigationTreeNode[];
  childrenById: Map<string, InvestigationTreeNode[]>;
}

const countDescendants = (nodeId: string, childrenById: TreeShape['childrenById']): number =>
  (childrenById.get(nodeId) ?? []).reduce(
    (sum, child) => sum + 1 + countDescendants(child.id, childrenById),
    0
  );

/**
 * Arranges the flat node list into a tree: `parent_id` links a node under its parent, nodes
 * without one (or pointing at an id that was never reported) are roots. Array order — the
 * order the agent appended nodes in — is preserved among siblings, so each level reads
 * chronologically.
 */
const buildTree = (nodes: InvestigationTreeNode[]): TreeShape => {
  const ids = new Set(nodes.map(({ id }) => id));
  const roots: InvestigationTreeNode[] = [];
  const childrenById = new Map<string, InvestigationTreeNode[]>();

  for (const node of nodes) {
    if (node.parent_id && ids.has(node.parent_id) && node.parent_id !== node.id) {
      const siblings = childrenById.get(node.parent_id) ?? [];
      siblings.push(node);
      childrenById.set(node.parent_id, siblings);
    } else {
      roots.push(node);
    }
  }

  return { roots, childrenById };
};

const NodeMarker: React.FC<{ node: InvestigationTreeNode }> = ({ node }) => {
  const { euiTheme } = useEuiTheme();
  const display = KIND_DISPLAY[node.kind];

  return (
    <EuiToolTip content={display.label}>
      <div
        css={css`
          width: ${MARKER_SIZE}px;
          height: ${MARKER_SIZE}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background-color: ${display.background(euiTheme)};
          border: ${euiTheme.border.width.thin} solid ${display.color(euiTheme)};
        `}
        data-test-subj={`investigationTreeNodeMarker-${node.kind}`}
      >
        {node.status === 'active' ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <EuiIcon type={display.icon} size="s" color={display.color(euiTheme)} />
        )}
      </div>
    </EuiToolTip>
  );
};

interface TreeNodeCardProps {
  node: InvestigationTreeNode;
  childrenById: TreeShape['childrenById'];
  confidenceByCandidate: Map<string, number>;
  getReferenceHref?: (reference: InvestigationReference) => string | undefined;
  isLast: boolean;
}

const TreeNodeCard: React.FC<TreeNodeCardProps> = ({
  node,
  childrenById,
  confidenceByCandidate,
  getReferenceHref,
  isLast,
}) => {
  const { euiTheme } = useEuiTheme();
  const children = childrenById.get(node.id) ?? [];
  const statusBadge = node.status ? STATUS_BADGE[node.status] : undefined;
  const confidence = node.kind === 'hypothesis' ? confidenceByCandidate.get(node.title) : undefined;
  const muted = isSettledBranch(node.status);

  /**
   * Progressive disclosure, per node: the title row and reference chips are always visible
   * (a scanning reader sees WHAT happened and what it's grounded in), while the long-form
   * detail and any embedded chart sit behind a toggle. Nodes that demand attention right now
   * — the branch being worked (`active`) and the final `conclusion` — start expanded.
   */
  const hasExpandableContent = Boolean(node.detail || node.chart);
  const [detailOverride, setDetailOverride] = useState<boolean | undefined>(undefined);
  const detailExpanded = detailOverride ?? (node.status === 'active' || node.kind === 'conclusion');

  /**
   * Sub-steps of a settled branch (a dismissed hypothesis, an abandoned approach) are the
   * audit trail, not the story — fold them behind a count so the spine stays readable.
   */
  const [branchOverride, setBranchOverride] = useState<boolean | undefined>(undefined);
  const branchExpanded = branchOverride ?? !isSettledBranch(node.status);
  const hiddenStepCount = useMemo(
    () => countDescendants(node.id, childrenById),
    [node.id, childrenById]
  );

  const showChildren = children.length > 0 && branchExpanded;

  return (
    <div
      css={css`
        position: relative;
        padding-bottom: ${isLast ? 0 : euiTheme.size.m};
        /* Rail segment connecting this marker to the next sibling's marker. */
        &::before {
          content: '';
          position: absolute;
          left: ${MARKER_SIZE / 2}px;
          top: ${MARKER_SIZE}px;
          bottom: 0;
          width: ${euiTheme.border.width.thin};
          background-color: ${euiTheme.colors.borderBaseSubdued};
          display: ${isLast && !showChildren ? 'none' : 'block'};
        }
      `}
      data-test-subj="investigationTreeNode"
    >
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <NodeMarker node={node} />
        </EuiFlexItem>
        <EuiFlexItem
          grow={true}
          css={css`
            opacity: ${muted ? 0.75 : 1};
            min-width: 0;
            padding-top: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            alignItems="baseline"
            wrap
            onClick={hasExpandableContent ? () => setDetailOverride(!detailExpanded) : undefined}
            css={
              hasExpandableContent
                ? css`
                    cursor: pointer;
                  `
                : undefined
            }
            data-test-subj="investigationTreeNodeHeader"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{node.title}</strong>
              </EuiText>
            </EuiFlexItem>
            {statusBadge && (
              <EuiFlexItem grow={false}>
                <EuiBadge color={statusBadge.color}>{statusBadge.label}</EuiBadge>
              </EuiFlexItem>
            )}
            {confidence != null && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={node.status === 'confirmed' ? 'success' : 'hollow'}
                  data-test-subj="investigationTreeNodeConfidence"
                >
                  <FormattedMessage
                    id="xpack.investigationOutput.nodeConfidenceBadgeLabel"
                    defaultMessage="{confidence, number, percent}"
                    values={{ confidence }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
            {node.chart && !detailExpanded && (
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type="visLine"
                  size="s"
                  color={euiTheme.colors.textSubdued}
                  aria-hidden={true}
                />
              </EuiFlexItem>
            )}
            {hasExpandableContent && (
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={detailExpanded ? 'arrowDown' : 'arrowRight'}
                  size="s"
                  color={euiTheme.colors.textSubdued}
                  data-test-subj="investigationTreeNodeToggle"
                  aria-hidden={true}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          {(node.references?.length ?? 0) > 0 && (
            <div
              css={css`
                margin-top: ${euiTheme.size.xs};
              `}
            >
              <ReferenceChips references={node.references!} getReferenceHref={getReferenceHref} />
            </div>
          )}

          {detailExpanded && node.detail && (
            <EuiMarkdownFormat
              textSize="xs"
              color="subdued"
              data-test-subj="investigationTreeNodeDetail"
              css={css`
                margin-top: ${euiTheme.size.xs};
              `}
            >
              {node.detail}
            </EuiMarkdownFormat>
          )}

          {detailExpanded && node.chart && (
            <div
              css={css`
                margin-top: ${euiTheme.size.s};
              `}
            >
              <NodeChart chart={node.chart} />
            </div>
          )}

          {children.length > 0 && !branchExpanded && (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="arrowRight"
              color="text"
              onClick={() => setBranchOverride(true)}
              data-test-subj="investigationTreeNodeShowBranch"
            >
              <FormattedMessage
                id="xpack.investigationOutput.showBranchStepsLabel"
                defaultMessage="Show {count, plural, one {# step} other {# steps}}"
                values={{ count: hiddenStepCount }}
              />
            </EuiButtonEmpty>
          )}

          {showChildren && (
            <div
              css={css`
                margin-top: ${euiTheme.size.m};
              `}
            >
              {children.map((child, index) => (
                <TreeNodeCard
                  key={child.id}
                  node={child}
                  childrenById={childrenById}
                  confidenceByCandidate={confidenceByCandidate}
                  getReferenceHref={getReferenceHref}
                  isLast={index === children.length - 1}
                />
              ))}
            </div>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

export interface InvestigationTreeProps {
  nodes: InvestigationTreeNode[];
  /** Used to decorate hypothesis nodes with the matching hypothesis' confidence. */
  hypotheses?: InvestigationHypothesis[];
  getReferenceHref?: (reference: InvestigationReference) => string | undefined;
}

/**
 * Renders the investigation trail — the decision tree the agent builds while it works — as a
 * nested timeline: root nodes form the chronological spine, branches (hypotheses under the
 * observation that motivated them, evidence under the hypothesis it tests, dead ends where an
 * approach was abandoned) indent under their parent. Reference chips and embedded charts on
 * each node point back at the real data the reasoning is grounded in.
 */
export const InvestigationTree: React.FC<InvestigationTreeProps> = ({
  nodes,
  hypotheses,
  getReferenceHref,
}) => {
  const { roots, childrenById } = useMemo(() => buildTree(nodes), [nodes]);

  const confidenceByCandidate = useMemo(
    () => new Map((hypotheses ?? []).map(({ candidate, confidence }) => [candidate, confidence])),
    [hypotheses]
  );

  if (roots.length === 0) return null;

  return (
    <div data-test-subj="investigationTree">
      {roots.map((node, index) => (
        <TreeNodeCard
          key={node.id}
          node={node}
          childrenById={childrenById}
          confidenceByCandidate={confidenceByCandidate}
          getReferenceHref={getReferenceHref}
          isLast={index === roots.length - 1}
        />
      ))}
    </div>
  );
};
