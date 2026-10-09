/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext } from 'react';
import { css, keyframes } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiText,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { HypothesisStatus } from '../../../common/hypotheses/hypotheses';
import type { InvestigationProposalSummary } from '../../../common/investigations/investigation';
import type { InvestigationSubjectType } from '../../../common/subjects/subject';
import { getSubjectTitle } from '../../subjects/attachments/subject_title';
import { SUBJECT_TYPE_LABELS } from '../../subjects/attachments/translations';
import type { HypothesisTreeNodeData, HypothesisTreeNodeKind } from './build_hypothesis_graph';
import { HYPOTHESIS_TREE_NODE_WIDTH } from './layout_hypothesis_graph';
import {
  COLLAPSE_LABEL,
  EXPAND_LABEL,
  HYPOTHESIS_STATUS_LABELS,
  NODE_LABELS,
  PROPOSAL_CONFIDENCE_LABELS,
  actionsCountLabel,
  hypothesesCountLabel,
  hypothesisConfidenceLabel,
  hypothesisStatusCountLabel,
  moreSubjectsLabel,
} from './translations';

export type HypothesisTreeFlowNodeData = HypothesisTreeNodeData & {
  isSelected: boolean;
  isDimmed: boolean;
  /** Which proposed action is open in the detail panel, when the actions node is selected. */
  selectedActionIndex: number | null;
};

export type HypothesisTreeFlowNode = Node<HypothesisTreeFlowNodeData, 'hypothesisTree'>;

interface HypothesisTreeActionsContextValue {
  onSelectAction: (index: number) => void;
  onToggleActionsExpanded: () => void;
}

/** Lets the actions node's own controls reach the canvas without going through node data. */
export const HypothesisTreeActionsContext = createContext<HypothesisTreeActionsContextValue>({
  onSelectAction: () => {},
  onToggleActionsExpanded: () => {},
});

/** Height of the coloured band that carries a node's role label. */
const OUTER_HEADER_HEIGHT = 40;
const OUTER_PADDING = 4;
const INNER_PADDING = 16;
const BODY_LINE_HEIGHT = 20;
const DIMMED_OPACITY = 0.45;

const nodeReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface RoleColors {
  background: string;
  border: string;
  strongBorder: string;
  label: string;
}

const useRoleColors = (kind: HypothesisTreeNodeKind): RoleColors => {
  const { colors } = useEuiTheme().euiTheme;
  switch (kind) {
    case 'trigger':
      return {
        background: colors.backgroundBaseDanger,
        border: colors.borderBaseDanger,
        strongBorder: colors.borderStrongDanger,
        label: colors.textDanger,
      };
    case 'hypothesis':
      return {
        background: colors.backgroundBaseHighlighted,
        border: colors.borderBaseSubdued,
        strongBorder: colors.borderStrongText,
        label: colors.textSubdued,
      };
    case 'hypotheses':
      return {
        background: colors.backgroundBasePlain,
        border: colors.borderBaseSubdued,
        strongBorder: colors.borderStrongText,
        label: colors.textSubdued,
      };
    case 'conclusion':
      return {
        background: colors.backgroundBaseSuccess,
        border: colors.borderBaseSuccess,
        strongBorder: colors.borderStrongSuccess,
        label: colors.textSuccess,
      };
    case 'actions':
      return {
        background: colors.backgroundBasePrimary,
        border: colors.borderBasePrimary,
        strongBorder: colors.borderStrongPrimary,
        label: colors.textPrimary,
      };
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled hypothesis tree node: ${exhaustive}`);
    }
  }
};

const clampLines = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  line-clamp: ${lines};
  overflow: hidden;
  word-break: break-word;
`;

const hiddenHandleCss = css`
  opacity: 0;
  pointer-events: none;
`;

const NodeShell = ({
  kind,
  label,
  trailing,
  isSelected,
  isDimmed,
  revealIndex,
  footer,
  children,
}: {
  kind: HypothesisTreeNodeKind;
  label: string;
  trailing?: React.ReactNode;
  /** Rendered on the outer band below the header, for nodes without an inner card. */
  footer?: React.ReactNode;
  isSelected: boolean;
  isDimmed: boolean;
  /** Fades the node in on mount, staggered by its position in the row. */
  revealIndex?: number;
  children?: React.ReactNode;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const roleColors = useRoleColors(kind);

  return (
    <div
      data-test-subj={`investigationHypothesisTreeNode-${kind}`}
      css={css`
        box-sizing: border-box;
        width: ${HYPOTHESIS_TREE_NODE_WIDTH[kind]}px;
        padding: 0 ${OUTER_PADDING}px ${children ? OUTER_PADDING : 0}px;
        background: ${roleColors.background};
        border: ${euiTheme.border.width.thin} solid
          ${isSelected ? roleColors.strongBorder : roleColors.border};
        border-radius: ${euiTheme.border.radius.medium};
        box-shadow: ${isSelected ? `0 0 0 2px ${roleColors.strongBorder}` : 'none'};
        cursor: pointer;
        opacity: ${isDimmed ? DIMMED_OPACITY : 1};
        transition: opacity ${euiTheme.animation.normal} ease,
          border-color ${euiTheme.animation.fast} ease;

        &:hover {
          border-color: ${roleColors.strongBorder};
        }

        ${revealIndex !== undefined &&
        css`
          animation: ${nodeReveal} ${euiTheme.animation.slow} ease-out both;
          animation-delay: ${revealIndex * 60}ms;
        `}

        @media (prefers-reduced-motion: reduce) {
          animation: none;
          transition: none;
        }
      `}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} css={hiddenHandleCss} />
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
        css={css`
          height: ${OUTER_HEADER_HEIGHT}px;
          padding: 0 ${euiTheme.size.xs} 0 ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              color: ${roleColors.label};
              line-height: 18px;
            `}
          >
            {label}
          </EuiText>
        </EuiFlexItem>
        {trailing && <EuiFlexItem grow={false}>{trailing}</EuiFlexItem>}
      </EuiFlexGroup>
      {footer && (
        <div
          css={css`
            padding: 0 ${euiTheme.size.s} ${euiTheme.size.m};
          `}
        >
          {footer}
        </div>
      )}
      {children && (
        <div
          css={css`
            box-sizing: border-box;
            margin-top: ${euiTheme.size.xs};
            padding: ${INNER_PADDING}px;
            background: ${euiTheme.colors.backgroundBasePlain};
            border: ${euiTheme.border.thin};
            border-color: ${euiTheme.colors.borderBaseSubdued};
            border-radius: ${euiTheme.size.s};
          `}
        >
          {children}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        css={hiddenHandleCss}
      />
    </div>
  );
};

const BodyText = ({
  children,
  lines,
  bold = false,
}: {
  children: React.ReactNode;
  lines: number;
  bold?: boolean;
}): React.ReactElement => (
  <EuiText
    size="s"
    css={css`
      line-height: ${BODY_LINE_HEIGHT}px;
      min-height: ${lines * BODY_LINE_HEIGHT}px;
      ${bold && 'font-weight: 700;'}
      ${clampLines(lines)}
    `}
  >
    {children}
  </EuiText>
);

const ClampedMarkdown = ({
  text,
  lines,
  color,
}: {
  text: string;
  lines: number;
  color?: 'subdued';
}): React.ReactElement => (
  <div
    css={css`
      min-height: ${lines * BODY_LINE_HEIGHT}px;
      ${clampLines(lines)}
    `}
  >
    <EuiMarkdownFormat textSize="s" color={color}>
      {text}
    </EuiMarkdownFormat>
  </div>
);

const TRIGGER_ICONS: Record<InvestigationSubjectType, IconType> = {
  alert: 'warning',
  significant_event: 'sparkles',
  manual: 'question',
  slack_thread: 'logoSlack',
};

export const HypothesisStatusBadge = ({
  status,
}: {
  status: HypothesisStatus;
}): React.ReactElement => {
  switch (status) {
    case 'confirmed':
      return (
        <EuiBadge color="success" iconType="checkCircle">
          {HYPOTHESIS_STATUS_LABELS.confirmed}
        </EuiBadge>
      );
    case 'dismissed':
      return (
        <EuiBadge color="default" iconType="cross">
          {HYPOTHESIS_STATUS_LABELS.dismissed}
        </EuiBadge>
      );
    case 'investigating':
      return (
        <EuiBadge color="hollow">
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
            <EuiLoadingSpinner size="s" />
            <span>{HYPOTHESIS_STATUS_LABELS.investigating}</span>
          </EuiFlexGroup>
        </EuiBadge>
      );
    default: {
      const exhaustive: never = status;
      throw new Error(`Unhandled hypothesis status: ${exhaustive}`);
    }
  }
};

/** How many cards peek out behind the front of a collapsed stack. */
const MAX_STACK_LAYERS = 2;
const STACK_LAYER_OFFSET = 4;

const ActionCard = ({
  proposal: { title, confidence },
  index,
  isSelected,
}: {
  proposal: InvestigationProposalSummary;
  index: number;
  isSelected: boolean;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { onSelectAction } = useContext(HypothesisTreeActionsContext);

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj={`investigationHypothesisTreeAction-${index}`}
      aria-label={title}
      onClick={(event: React.MouseEvent) => {
        // The node's own click would select the stack as a whole rather than this action.
        event.stopPropagation();
        onSelectAction(index);
      }}
      css={css`
        position: relative;
        width: 100%;
        text-align: left;
        border-color: ${isSelected
          ? euiTheme.colors.borderStrongPrimary
          : euiTheme.colors.borderBaseSubdued};
        box-shadow: ${isSelected ? `0 0 0 1px ${euiTheme.colors.borderStrongPrimary}` : 'none'};

        &:hover {
          border-color: ${euiTheme.colors.borderStrongPrimary};
        }
      `}
    >
      <BodyText lines={3} bold>
        {title}
      </BodyText>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        {PROPOSAL_CONFIDENCE_LABELS[confidence]}
      </EuiText>
    </EuiPanel>
  );
};

const ActionsStack = ({
  proposals,
  isExpanded,
  selectedIndex,
}: {
  proposals: InvestigationProposalSummary[];
  isExpanded: boolean;
  selectedIndex: number | null;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { onToggleActionsExpanded } = useContext(HypothesisTreeActionsContext);
  const [recommended] = proposals;
  const layerCount = Math.min(proposals.length - 1, MAX_STACK_LAYERS);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      {isExpanded ? (
        proposals.map((proposal, index) => (
          <EuiFlexItem key={proposal.id} grow={false}>
            <ActionCard proposal={proposal} index={index} isSelected={selectedIndex === index} />
          </EuiFlexItem>
        ))
      ) : (
        <EuiFlexItem
          grow={false}
          data-test-subj="investigationHypothesisTreeActionsStack"
          css={css`
            position: relative;
            padding: 0 ${layerCount * STACK_LAYER_OFFSET}px ${layerCount * STACK_LAYER_OFFSET}px 0;
          `}
        >
          {Array.from({ length: layerCount }, (_, layer) => {
            const offset = (layerCount - layer) * STACK_LAYER_OFFSET;
            return (
              <div
                key={layer}
                aria-hidden={true}
                css={css`
                  position: absolute;
                  inset: ${offset}px 0 0 ${offset}px;
                  background: ${euiTheme.colors.backgroundBasePlain};
                  border: ${euiTheme.border.thin};
                  border-color: ${euiTheme.colors.borderBaseSubdued};
                  border-radius: ${euiTheme.border.radius.medium};
                `}
              />
            );
          })}
          <ActionCard proposal={recommended} index={0} isSelected={selectedIndex === 0} />
        </EuiFlexItem>
      )}
      {proposals.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <EuiLink
              data-test-subj="investigationHypothesisTreeActionsToggle"
              aria-expanded={isExpanded}
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                onToggleActionsExpanded();
              }}
            >
              {isExpanded ? COLLAPSE_LABEL : EXPAND_LABEL}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const STATUS_COUNT_BADGES: ReadonlyArray<{
  status: HypothesisStatus;
  color: string;
  iconType?: IconType;
}> = [
  { status: 'confirmed', color: 'success', iconType: 'check' },
  { status: 'dismissed', color: 'default', iconType: 'cross' },
  { status: 'investigating', color: 'hollow' },
];

const HypothesisTreeNodeComponent = ({
  data,
}: NodeProps<HypothesisTreeFlowNode>): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { isSelected, isDimmed } = data;
  const shellProps = { isSelected, isDimmed };

  switch (data.kind) {
    case 'trigger': {
      const [first, ...rest] = data.subjects;
      return (
        <NodeShell kind="trigger" label={NODE_LABELS.trigger} {...shellProps}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={first ? TRIGGER_ICONS[first.type] : 'magnifyExclamation'}
                size="m"
                aria-hidden={true}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <BodyText lines={2} bold>
                {first ? getSubjectTitle(first) : data.title}
              </BodyText>
              {first && (
                <EuiText size="xs" color="subdued">
                  {SUBJECT_TYPE_LABELS[first.type]}
                  {rest.length > 0 && ` · ${moreSubjectsLabel(rest.length)}`}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </NodeShell>
      );
    }

    case 'hypotheses':
      return (
        <NodeShell
          kind="hypotheses"
          label={hypothesesCountLabel(data.total)}
          {...shellProps}
          trailing={
            <EuiIcon
              type={data.isExpanded ? 'minimize' : 'maximize'}
              color="subdued"
              aria-hidden={true}
              css={css`
                margin-right: ${euiTheme.size.xs};
              `}
            />
          }
          footer={
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {STATUS_COUNT_BADGES.filter(({ status }) => data.counts[status] > 0).map(
                ({ status, color, iconType }) => (
                  <EuiFlexItem grow={false} key={status}>
                    <EuiBadge color={color} iconType={iconType}>
                      {hypothesisStatusCountLabel(status, data.counts[status])}
                    </EuiBadge>
                  </EuiFlexItem>
                )
              )}
            </EuiFlexGroup>
          }
        />
      );

    case 'hypothesis':
      return (
        <NodeShell
          kind="hypothesis"
          label={NODE_LABELS.hypothesis}
          {...shellProps}
          revealIndex={data.index}
        >
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <HypothesisStatusBadge status={data.hypothesis.status} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {hypothesisConfidenceLabel(data.hypothesis.confidence)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <BodyText lines={2} bold>
              {data.hypothesis.candidate}
            </BodyText>
            <ClampedMarkdown text={data.hypothesis.reason ?? ''} lines={3} color="subdued" />
          </EuiFlexGroup>
        </NodeShell>
      );

    case 'conclusion':
      return (
        <NodeShell kind="conclusion" label={NODE_LABELS.conclusion} {...shellProps}>
          <ClampedMarkdown text={data.conclusion} lines={4} />
        </NodeShell>
      );

    case 'actions':
      return (
        <NodeShell
          kind="actions"
          label={actionsCountLabel(data.proposals.length)}
          {...shellProps}
          footer={
            <ActionsStack
              proposals={data.proposals}
              isExpanded={data.isExpanded}
              selectedIndex={data.selectedActionIndex}
            />
          }
        />
      );

    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled hypothesis tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

export const HypothesisTreeNode = memo(HypothesisTreeNodeComponent);
