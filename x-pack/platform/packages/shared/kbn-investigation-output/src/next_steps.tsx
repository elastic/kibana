/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  InvestigationMitigationProposal,
  InvestigationNextStep,
  MitigationLevel,
  SignificantEventMitigationRun,
} from '@kbn/significant-events-schema';

const LEVEL_COLORS: Record<MitigationLevel, string> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const CONFIDENCE_LABEL = i18n.translate('xpack.investigationOutput.nextSteps.confidenceLabel', {
  defaultMessage: 'Confidence',
});
const RISK_LABEL = i18n.translate('xpack.investigationOutput.nextSteps.riskLabel', {
  defaultMessage: 'Risk',
});

const confidenceBadgeColor = (level: MitigationLevel): string =>
  // For confidence, high is good — invert the risk coloring.
  level === 'high' ? 'success' : level === 'medium' ? 'warning' : 'default';

/**
 * The most recent recorded run/decision for a proposal's workflow. Runs are recorded in
 * decision order, so the last match reflects the current state (e.g. a `suggested` decision
 * later followed by a `manual_run`).
 */
const findRunForProposal = (
  proposal: InvestigationMitigationProposal,
  runs: SignificantEventMitigationRun[]
): SignificantEventMitigationRun | undefined =>
  [...runs].reverse().find((run) => run.workflow_id === proposal.workflow_id);

const ExecutionLink: React.FC<{
  run: SignificantEventMitigationRun;
  getExecutionHref?: (workflowId: string, executionId: string) => string | undefined;
}> = ({ run, getExecutionHref }) => {
  const href = run.execution_id ? getExecutionHref?.(run.workflow_id, run.execution_id) : undefined;
  if (!href) {
    return null;
  }
  return (
    <EuiLink href={href} target="_blank" data-test-subj="investigationNextStepExecutionLink">
      {i18n.translate('xpack.investigationOutput.nextSteps.viewExecutionLink', {
        defaultMessage: 'View execution',
      })}
    </EuiLink>
  );
};

const MitigationStatus: React.FC<{
  proposal: InvestigationMitigationProposal;
  run?: SignificantEventMitigationRun;
  onRunMitigation?: (proposal: InvestigationMitigationProposal) => void | Promise<void>;
  getExecutionHref?: (workflowId: string, executionId: string) => string | undefined;
}> = ({ proposal, run, onRunMitigation, getExecutionHref }) => {
  const [isRunning, setIsRunning] = useState(false);

  if (run?.decision === 'auto_run' || run?.decision === 'manual_run') {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="success"
            iconType={run.decision === 'auto_run' ? 'sparkles' : 'play'}
            data-test-subj="investigationNextStepRunBadge"
          >
            {run.decision === 'auto_run'
              ? i18n.translate('xpack.investigationOutput.nextSteps.autoRunBadge', {
                  defaultMessage: 'Auto-run',
                })
              : i18n.translate('xpack.investigationOutput.nextSteps.manualRunBadge', {
                  defaultMessage: 'Triggered',
                })}
          </EuiBadge>
        </EuiFlexItem>
        {run.reason && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {run.reason}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <ExecutionLink run={run} getExecutionHref={getExecutionHref} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (run?.decision === 'rejected') {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="investigationNextStepRejected">
        <EuiIcon type="minusInCircle" size="s" />{' '}
        {i18n.translate('xpack.investigationOutput.nextSteps.rejectedText', {
          defaultMessage: 'Not auto-run: {reason}',
          values: {
            reason:
              run.reason ??
              i18n.translate('xpack.investigationOutput.nextSteps.rejectedNoReason', {
                defaultMessage: 'rejected by the auto-run gate',
              }),
          },
        })}
      </EuiText>
    );
  }

  // `suggested` (or no recorded decision yet): offer the one-click run when the host wired it.
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {onRunMitigation && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="play"
            isLoading={isRunning}
            data-test-subj="investigationNextStepRunButton"
            onClick={async () => {
              setIsRunning(true);
              try {
                await onRunMitigation(proposal);
              } finally {
                setIsRunning(false);
              }
            }}
          >
            {i18n.translate('xpack.investigationOutput.nextSteps.runWorkflowButton', {
              defaultMessage: 'Run workflow',
            })}
          </EuiButton>
        </EuiFlexItem>
      )}
      {run?.reason && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {run.reason}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const MitigationCard: React.FC<{
  step: InvestigationNextStep;
  proposal: InvestigationMitigationProposal;
  run?: SignificantEventMitigationRun;
  onRunMitigation?: (proposal: InvestigationMitigationProposal) => void | Promise<void>;
  getExecutionHref?: (workflowId: string, executionId: string) => string | undefined;
}> = ({ step, proposal, run, onRunMitigation, getExecutionHref }) => {
  const inputEntries = Object.entries(proposal.inputs ?? {});

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="investigationNextStepMitigationCard">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon type="wrench" size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xxs">
            <h5>{proposal.workflow_name ?? proposal.workflow_id}</h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={confidenceBadgeColor(proposal.confidence)}>
            {`${CONFIDENCE_LABEL}: ${proposal.confidence}`}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={LEVEL_COLORS[proposal.risk]}
          >{`${RISK_LABEL}: ${proposal.risk}`}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>{step.description}</p>
      </EuiText>
      {proposal.rationale && (
        <EuiText size="xs" color="subdued">
          <p>{proposal.rationale}</p>
        </EuiText>
      )}

      {inputEntries.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            compressed
            type="column"
            columnWidths={[1, 3]}
            data-test-subj="investigationNextStepInputs"
            listItems={inputEntries.map(([key, value]) => ({
              title: key,
              description: typeof value === 'string' ? value : JSON.stringify(value),
            }))}
          />
        </>
      )}

      <EuiSpacer size="s" />
      <MitigationStatus
        proposal={proposal}
        run={run}
        onRunMitigation={onRunMitigation}
        getExecutionHref={getExecutionHref}
      />
    </EuiPanel>
  );
};

/**
 * Renders the structured `next_steps` of a completed investigation: plain recommendations as a
 * list, and mitigation-workflow proposals as cards showing the proposed inputs, the agent's
 * confidence/risk assessment, and what happened to the proposal (auto-run by the gate, manually
 * triggered, rejected, or awaiting a human) — with a one-click run when the host provides
 * `onRunMitigation`.
 */
export const NextSteps: React.FC<{
  steps: InvestigationNextStep[];
  mitigationRuns?: SignificantEventMitigationRun[];
  onRunMitigation?: (proposal: InvestigationMitigationProposal) => void | Promise<void>;
  getExecutionHref?: (workflowId: string, executionId: string) => string | undefined;
}> = ({ steps, mitigationRuns = [], onRunMitigation, getExecutionHref }) => {
  const plainSteps = steps.filter((step) => !step.mitigation);
  const mitigationSteps = steps.filter(
    (step): step is InvestigationNextStep & { mitigation: InvestigationMitigationProposal } =>
      step.mitigation != null
  );

  return (
    <div data-test-subj="investigationNextSteps">
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.investigationOutput.nextSteps.title', {
            defaultMessage: 'Next steps',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />

      {mitigationSteps.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="s">
          {mitigationSteps.map((step) => (
            <EuiFlexItem key={step.mitigation.workflow_id} grow={false}>
              <MitigationCard
                step={step}
                proposal={step.mitigation}
                run={findRunForProposal(step.mitigation, mitigationRuns)}
                onRunMitigation={onRunMitigation}
                getExecutionHref={getExecutionHref}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}

      {plainSteps.length > 0 && (
        <>
          {mitigationSteps.length > 0 && <EuiSpacer size="s" />}
          <EuiText size="s" data-test-subj="investigationNextStepsPlain">
            <ul>
              {plainSteps.map((step) => (
                <li key={step.description}>{step.description}</li>
              ))}
            </ul>
          </EuiText>
        </>
      )}
    </div>
  );
};
