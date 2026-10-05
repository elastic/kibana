/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InvestigationTrace, TraceStep, TraceStepType } from '../../../common/trace/trace';
import { EvidenceView } from '../../evidence/evidence_view';
import type {
  InvestigationAttachmentContentProps,
  InvestigationAttachmentVariant,
} from '../../investigation_attachments';
import { StepIcon, type StepIconTone } from '../../investigation_attachments/step_icon';

const NO_STEPS = i18n.translate('xpack.agenticInvestigations.trace.empty', {
  defaultMessage: 'No steps recorded yet.',
});

const HOW_LABEL = i18n.translate('xpack.agenticInvestigations.trace.how', {
  defaultMessage: 'How it was checked',
});

const decisionTreeLabel = (decisionTree: string): string =>
  i18n.translate('xpack.agenticInvestigations.trace.decisionTree', {
    defaultMessage: 'Followed decision tree {decisionTree}',
    values: { decisionTree },
  });

const decisionTreeNodeLabel = (node: string): string =>
  i18n.translate('xpack.agenticInvestigations.trace.decisionTreeNode', {
    defaultMessage: 'Tree node {node}',
    values: { node },
  });

const STEP_TYPE_LABELS: Record<TraceStepType, string> = {
  symptom: i18n.translate('xpack.agenticInvestigations.trace.type.symptom', {
    defaultMessage: 'Symptom',
  }),
  evidence_gatherer: i18n.translate('xpack.agenticInvestigations.trace.type.evidenceGatherer', {
    defaultMessage: 'Check',
  }),
  decision: i18n.translate('xpack.agenticInvestigations.trace.type.decision', {
    defaultMessage: 'Decision',
  }),
  end: i18n.translate('xpack.agenticInvestigations.trace.type.end', {
    defaultMessage: 'Conclusion',
  }),
};

const STEP_TYPE_ICONS: Record<TraceStepType, IconType> = {
  symptom: 'warning',
  evidence_gatherer: 'search',
  decision: 'branch',
  end: 'flag',
};

const STEP_TYPE_COLORS: Record<TraceStepType, StepIconTone> = {
  symptom: 'danger',
  evidence_gatherer: 'primary',
  decision: 'warning',
  end: 'success',
};

const TraceStepItem = ({
  step: { type, label, method, finding, outcome, decision_tree_node: node, evidence },
  index,
  variant,
}: {
  step: TraceStep;
  index: number;
  variant: InvestigationAttachmentVariant;
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationTraceStepHow' });
  const isDetails = variant === 'details';
  return (
    <EuiTimelineItem
      verticalAlign="top"
      data-test-subj={`investigationTraceStep-${type}`}
      icon={
        <StepIcon
          label={STEP_TYPE_LABELS[type]}
          iconType={STEP_TYPE_ICONS[type]}
          tone={STEP_TYPE_COLORS[type]}
        />
      }
    >
      <EuiPanel hasBorder hasShadow={false} paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <span>{index + 1}</span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{STEP_TYPE_LABELS[type]}</EuiBadge>
          </EuiFlexItem>
          {node && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="default" iconType="branch">
                {decisionTreeNodeLabel(node)}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiTitle size="xxs">
          <h4 data-test-subj="investigationTraceStepLabel">{label}</h4>
        </EuiTitle>
        {isDetails && finding?.trim() && (
          <>
            <EuiSpacer size="xs" />
            <EuiMarkdownFormat textSize="s">{finding}</EuiMarkdownFormat>
          </>
        )}
        {isDetails && evidence && (
          <>
            <EuiSpacer size="s" />
            <EvidenceView evidence={evidence} />
          </>
        )}
        {isDetails && method?.trim() && (
          <>
            <EuiSpacer size="s" />
            <EuiAccordion
              id={accordionId}
              buttonContent={
                <EuiText size="xs">
                  <span>{HOW_LABEL}</span>
                </EuiText>
              }
              paddingSize="s"
              data-test-subj="investigationTraceStepMethod"
            >
              <EuiMarkdownFormat textSize="xs">{method}</EuiMarkdownFormat>
            </EuiAccordion>
          </>
        )}
        {outcome && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="sortDown" size="s" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued" data-test-subj="investigationTraceStepOutcome">
                  <em>{outcome}</em>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </EuiTimelineItem>
  );
};

/**
 * The route the investigation took, step by step in the order taken: what each step looked at,
 * in decision tree node types, and the branch it led to. The details flyout also shows what each
 * step found, its evidence, and how it was checked.
 */
export const TraceStepsList: React.FC<{
  steps: TraceStep[];
  decisionTree?: string;
  variant: InvestigationAttachmentVariant;
}> = ({ steps, decisionTree, variant }) => {
  if (steps.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationTraceEmpty">
        {NO_STEPS}
      </EuiText>
    );
  }
  return (
    <div data-test-subj="investigationTrace">
      {decisionTree && (
        <>
          <EuiBadge color="hollow" iconType="branch" data-test-subj="investigationTraceTree">
            {decisionTreeLabel(decisionTree)}
          </EuiBadge>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiTimeline gutterSize="m">
        {steps.map((step, index) => (
          <TraceStepItem key={index} step={step} index={index} variant={variant} />
        ))}
      </EuiTimeline>
    </div>
  );
};

export const TraceView: React.FC<InvestigationAttachmentContentProps<InvestigationTrace>> = ({
  document: { steps, decisionTree },
  variant,
}) => <TraceStepsList steps={steps} decisionTree={decisionTree} variant={variant} />;
