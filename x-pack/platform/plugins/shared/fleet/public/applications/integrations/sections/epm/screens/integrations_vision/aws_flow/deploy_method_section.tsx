/**
 * DeployMethodSection — recurring middle step: how to connect the
 * integration (Elastic managed / Agentless vs Agent-based).
 *
 * Figma 3155:78406 (side-by-side cards per her 09-08 call — mirrors the Data
 * schema row; Figma update to follow). One of the reusable middle-step
 * sections in the step grammar: the first step is always Schema & Signals,
 * the last always Summary, and integrations that support both deployment
 * modes get this section in between.
 *
 * Agent policy reveal (her call, 09-08 pm): picking Agent-based reveals the
 * policy choice INLINE on the same step — no extra wizard step (500
 * integrations, the grammar caps flows at ~4 steps). The revealed block is
 * deliberately DEMOTED: subdued panel, compressed plain radios, small field —
 * it must read as a consequence of the card above, never as a peer decision.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFieldText,
  EuiFormRow,
  EuiRadio,
  EuiSelect,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { OptionsRow, StepChoiceCard, StepSectionHeading } from './step_primitives';

export type DeploymentMode = 'agentless' | 'agent-based';

type PolicyMode = 'new' | 'existing';

/** Demo data until Fleet wiring exists. */
const DEMO_POLICIES = [
  { value: 'policy-1', text: 'Agent policy 1' },
  { value: 'policy-2', text: 'Agent policy 2' },
  { value: 'policy-3', text: 'Linux fleet — production' },
];

export interface DeployMethodSectionProps {
  /** Integration display name for the question line. */
  integrationTitle: string;
  mode: DeploymentMode;
  onModeChange: (mode: DeploymentMode) => void;
}

export const DeployMethodSection = ({
  integrationTitle,
  mode,
  onModeChange,
}: DeployMethodSectionProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  // Prototype-local: the policy choice resets with the section, which is fine
  // until Fleet wiring exists.
  const [policyMode, setPolicyMode] = useState<PolicyMode>('new');
  const [policyName, setPolicyName] = useState('Agent policy 2');
  const [existingPolicy, setExistingPolicy] = useState(DEMO_POLICIES[0].value);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.base}; /* 16px throughout: heading→cards AND cards→consequence zone (step_primitives rule) */
        width: 100%;
      `}
    >
      <StepSectionHeading>
        How would you like to connect {integrationTitle} to Elastic?
      </StepSectionHeading>

      {/* Side by side, like Data schema (her call, 09-08). StepChoiceCard since
          09-15 — one canonical card style across Data schema/Signals/Deploy.
          "(Agentless)" dropped from the title (user call, 09-15). */}
      <OptionsRow>
        <StepChoiceCard
          id="deployment-agentless"
          control="radio"
          name="deployment-mode"
          title="Elastic Managed Integration"
          badge={<EuiBadge color="default">Recommended</EuiBadge>}
          description="Best for simple setup and faster onboarding."
          checked={mode === 'agentless'}
          onChange={() => onModeChange('agentless')}
        />
        <StepChoiceCard
          id="deployment-agent-based"
          control="radio"
          name="deployment-mode"
          title="Agent-based"
          description="Deploy Elastic Agent to collect data from your environment. Best if you already run agents or need more control."
          checked={mode === 'agent-based'}
          onChange={() => onModeChange('agent-based')}
        />
      </OptionsRow>

      {/* Consequence zone — revealed by Agent-based, visually demoted:
          subdued panel + compressed plain radios, never full-size cards. */}
      {mode === 'agent-based' && (
        <div
          css={css`
            background: ${euiTheme.colors.backgroundBaseSubdued};
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
            border-radius: ${euiTheme.border.radius.small};
            padding: ${euiTheme.size.base};
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.m};

            @keyframes policyRevealFade {
              from {
                opacity: 0;
                transform: translateY(-4px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            animation: policyRevealFade ${euiTheme.animation.normal} ease-out;
          `}
        >
          <div css={css`display: flex; flex-direction: column; gap: 4px;`}>
            <span
              css={css`
                font-size: 14px;
                font-weight: ${euiTheme.font.weight.semiBold};
                color: ${euiTheme.colors.textHeading};
                line-height: 20px;
              `}
            >
              Agent policy
            </span>
            <span
              css={css`
                font-size: 12.25px;
                line-height: 16px;
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              Agent policies manage a group of integrations across a set of agents.
            </span>
          </div>

          <div css={css`display: flex; gap: ${euiTheme.size.l};`}>
            <EuiRadio
              id="policy-new"
              label="Create a new policy"
              checked={policyMode === 'new'}
              onChange={() => setPolicyMode('new')}
            />
            <EuiRadio
              id="policy-existing"
              label="Use an existing policy"
              checked={policyMode === 'existing'}
              onChange={() => setPolicyMode('existing')}
            />
          </div>

          {policyMode === 'new' ? (
            <EuiFormRow
              label="New agent policy name"
              helpText="Created automatically with this integration. You can add agents in the next step."
              fullWidth
            >
              <EuiFieldText
                compressed
                fullWidth
                value={policyName}
                onChange={(event) => setPolicyName(event.target.value)}
                aria-label="New agent policy name"
              />
            </EuiFormRow>
          ) : (
            <EuiFormRow label="Agent policy" fullWidth>
              <EuiSelect
                compressed
                fullWidth
                options={DEMO_POLICIES}
                value={existingPolicy}
                onChange={(event) => setExistingPolicy(event.target.value)}
                aria-label="Select agent policy"
              />
            </EuiFormRow>
          )}
        </div>
      )}
    </div>
  );
};
