/**
 * DataSchemaSection — the "Data schema" block of Step 0 (Schema & Signals).
 *
 * Figma:
 *   3169:85586  Two options — OTel first, "Recommended", pre-selected
 *   3169:86206  One option, Observability — static panel, "OTel not available"
 *   3169:88441  One option, Security — static panel, "the standard for Elastic Security"
 *   3169:86231  Static panel spec: backgroundBaseSubdued + borderBasePlain,
 *               radius 4, p16, title/description 2px apart
 *
 * Display rules (her decisions, 09-08 — annotation 3169:86199):
 * - OTel is the default for Observability; ECS is the ONLY option for Security.
 * - When both schemas apply → radio cards, OTel first with the Recommended
 *   badge and pre-selected. The "can't be changed after installation" warning
 *   shows only here — a single option has nothing to change.
 * - When only one schema applies → a static, visibly non-interactive panel
 *   (subdued fill), never a dead toggle. The sentence explains WHY it's the
 *   only one, tailored per solution.
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiRadio, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { StepSection, StepSectionHeader, StepSectionHeading, OptionsRow } from './step_primitives';

export type SchemaId = 'otel' | 'ecs';

/** Which schemas the integration ships in. */
export type SchemaAvailability = 'both' | 'ecs-only' | 'otel-only';

/** Single-option copy is tailored per solution (her call, 09-08). */
export type SolutionContext = 'observability' | 'security';

const CHOICE_COPY: Record<SchemaId, { title: string; blurb: string }> = {
  otel: {
    title: 'OpenTelemetry',
    // Figma 3169:85586 — short form when it sits next to ECS.
    blurb: 'OpenTelemetry semantic conventions.',
  },
  ecs: {
    title: 'ECS',
    blurb: 'Elastic Common Schema — best for compatibility.',
  },
};

/** The static-panel sentence: same fact, tailored reason per context. */
const singleOptionBlurb = (schema: SchemaId, solution: SolutionContext): string => {
  if (schema === 'otel') {
    return 'OpenTelemetry semantic conventions - best for open standards and portability. ECS not available for this integration.';
  }
  return solution === 'security'
    ? 'Elastic Common Schema field mappings — the standard for Elastic Security.'
    : 'Elastic Common Schema field mappings - best for compatibility. OpenTelemetry not available for this integration.';
};

export interface DataSchemaSectionProps {
  availability: SchemaAvailability;
  /** Tailors the single-option sentence. Defaults to Observability. */
  solution?: SolutionContext;
  value: SchemaId;
  onChange: (schema: SchemaId) => void;
}

export const DataSchemaSection = ({
  availability,
  solution = 'observability',
  value,
  onChange,
}: DataSchemaSectionProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const hasChoice = availability === 'both';
  const singleSchema: SchemaId = availability === 'otel-only' ? 'otel' : 'ecs';

  return (
    <StepSection>
      <StepSectionHeader>
        {/* Permanence note moved into a ⓘ tooltip (09-15): zero vertical space,
            zero visual weight at rest; the Summary step re-confirms the choice. */}
        <div css={css`display: flex; align-items: center; gap: 6px;`}>
          <StepSectionHeading>Data schema</StepSectionHeading>
          {hasChoice && (
            <EuiToolTip
              content="This choice is permanent — switching schema after installation requires creating a new integration policy."
              position="top"
            >
              {/* "info" — Borealis name; "iInCircle" was removed and renders a broken box */}
              <EuiIcon type="info" size="s" color="subdued" tabIndex={0} css={css`cursor: help;`} />
            </EuiToolTip>
          )}
        </div>
      </StepSectionHeader>

      {hasChoice ? (
        <OptionsRow>
          {/* Custom radio card — Figma 3169:85607; p:12/16, subdued left strip,
              blurb 12.25px/20px, radio vertically centered (09-14) */}
          {(['otel', 'ecs'] as const).map((option) => {
            const isChecked = value === option;
            return (
              <label
                key={option}
                htmlFor={`schema-${option}`}
                css={css`
                  display: flex;
                  align-items: stretch;
                  border: 1px solid ${isChecked ? euiTheme.colors.borderStrongPrimary : '#D6DDEA'};
                  border-radius: 6px;
                  background: ${isChecked ? euiTheme.colors.backgroundBasePrimary : euiTheme.colors.backgroundBasePlain};
                  flex: 1 1 0;
                  min-width: 0;
                  cursor: pointer;
                  overflow: hidden;
                  transition:
                    border-color ${euiTheme.animation.fast} ease,
                    background ${euiTheme.animation.fast} ease;
                  &:hover {
                    border-color: ${euiTheme.colors.borderStrongPrimary};
                  }
                `}
              >
                {/* Left strip — subdued background, radio centered */}
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px ${euiTheme.size.base};
                    background: ${isChecked ? euiTheme.colors.backgroundBasePrimary : euiTheme.colors.backgroundBaseSubdued};
                    border-right: 1px solid ${isChecked ? euiTheme.colors.borderStrongPrimary : '#D6DDEA'};
                    flex-shrink: 0;
                    transition:
                      background ${euiTheme.animation.fast} ease,
                      border-color ${euiTheme.animation.fast} ease;
                  `}
                >
                  <EuiRadio
                    id={`schema-${option}`}
                    name="data-schema"
                    checked={isChecked}
                    onChange={() => onChange(option)}
                    aria-label={CHOICE_COPY[option].title}
                  />
                </div>
                {/* Right content */}
                <div
                  css={css`
                    padding: 12px ${euiTheme.size.base};
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex: 1 1 0;
                    min-width: 0;
                  `}
                >
                  <div css={css`display: flex; align-items: center; gap: ${euiTheme.size.s};`}>
                    <strong
                      css={css`
                        font-size: 14px;
                        font-weight: ${euiTheme.font.weight.semiBold};
                        color: ${euiTheme.colors.textHeading};
                        line-height: 20px;
                      `}
                    >
                      {CHOICE_COPY[option].title}
                    </strong>
                    {option === 'otel' && <EuiBadge color="default">Recommended</EuiBadge>}
                  </div>
                  <span
                    css={css`
                      font-size: 12.25px;
                      color: ${euiTheme.colors.textSubdued};
                      line-height: 16px;
                    `}
                  >
                    {CHOICE_COPY[option].blurb}
                  </span>
                </div>
              </label>
            );
          })}
        </OptionsRow>
      ) : (
        /* Single option → static panel (Figma 3169:86231): subdued fill +
           plain border reads as a fact, not a control. Title/blurb 2px apart. */
        <div
          css={css`
            background: ${euiTheme.colors.backgroundBaseSubdued};
            border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
            border-radius: ${euiTheme.border.radius.small};
            padding: ${euiTheme.size.base};
            display: flex;
            flex-direction: column;
            gap: 2px;
            width: 100%;
          `}
        >
          <strong
            css={css`
              font-size: 14px;
              font-weight: ${euiTheme.font.weight.semiBold};
              color: ${euiTheme.colors.textHeading};
              line-height: 20px;
            `}
          >
            {CHOICE_COPY[singleSchema].title}
          </strong>
          <EuiText size="xs" color="subdued">
            <p>{singleOptionBlurb(singleSchema, solution)}</p>
          </EuiText>
        </div>
      )}
    </StepSection>
  );
};
