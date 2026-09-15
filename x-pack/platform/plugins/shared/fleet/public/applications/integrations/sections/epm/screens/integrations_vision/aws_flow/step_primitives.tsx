/**
 * Shared primitives for wizard step sections.
 *
 * Step grammar (her PM sync 09-04, hi-fi'd 09-08 — Figma 3169:85892):
 * every integration and collection wizard opens with "Schema & Signals"
 * (Step 0) and closes with "Summary"; the middle depends on the integration
 * but draws from this library of recurring, reusable sections.
 *
 * Spacing rules (Figma, confirmed 09-10):
 *   24px (size.l)    — between independent sections (e.g. Data schema → Signals).
 *   16px (size.base) — between a selection and its conditional reveal, i.e. when a
 *                      horizontal divider or a "consequence zone" appears (e.g.
 *                      Deploy cards → Agent policy panel). The reveal is visually
 *                      demoted (subdued panel) so the 16px reinforces that it is a
 *                      child of the selection, not a peer section.
 *    8px (size.s)    — inside a section: heading block → options.
 *    4px (size.xs)   — heading → fine-print description.
 */

import React from 'react';
import { EuiCheckbox, EuiRadio, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** Figma "Heading 4" — 16px semibold / 24px. EuiTitle xs (09-15; was xxs=14px). */
export const StepSectionHeading = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <EuiTitle size="xs">
    <h5 css={css`margin: 0; font-weight: 600; line-height: 24px;`}>
      {children}
    </h5>
  </EuiTitle>
);

/** Figma "Fine print (small)" — 12.25px regular / 16px, subdued. */
export const FinePrint = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <p
      css={css`
        font-size: 12.25px;
        font-weight: 400;
        line-height: 16px;
        color: ${euiTheme.colors.textSubdued};
        margin: 0;
      `}
    >
      {children}
    </p>
  );
};

/** Column of step sections — Figma 3169:85597: 24px (spaces/l) between sections. */
export const StepSections = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.l};
        width: 100%;
      `}
    >
      {children}
    </div>
  );
};

/** One section: heading block + options, 12px apart (09-15: bumped from the
 *  Figma 3169:85601 8px — heading needed a touch more air; applies everywhere). */
export const StepSection = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
        width: 100%;
      `}
    >
      {children}
    </div>
  );
};

/** Heading + optional fine-print description, 4px apart (Figma 3169:85602). */
export const StepSectionHeader = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <div
    css={css`
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    `}
  >
    {children}
  </div>
);

/**
 * Equal-width option cards row (Figma 3169:85607 / 3169:87176: 8px gaps).
 * The doubled && beats EuiCheckableCard's own flex: 0 1 0 (same specificity,
 * later in the sheet).
 */
export const OptionsRow = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        gap: ${euiTheme.size.s};
        align-items: stretch;
        width: 100%;

        && > * {
          flex: 1 1 0;
          min-width: 0;
        }
      `}
    >
      {children}
    </div>
  );
};

/**
 * StepChoiceCard — THE canonical big checkable card (09-15 unification).
 *
 * One style across every step: Data schema, Signals, Deploy method. Left
 * strip with the control (radio/checkbox) on subdued fill, content on the
 * right: 14px semibold title (+optional badge), 12.25px subdued description.
 * Extracted from the Data schema custom card (Figma 3169:85607) after the
 * user flagged EuiCheckableCard and the custom card looking like two
 * different products on adjacent steps.
 */
export interface StepChoiceCardProps {
  id: string;
  /** 'radio' for single-select rows, 'checkbox' for multi-select. */
  control: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  /** Optional badge rendered inline after the title (e.g. Recommended). */
  badge?: React.ReactNode;
  /** Optional 12.25px subdued description under the title. */
  description?: React.ReactNode;
}

export const StepChoiceCard = ({
  id,
  control,
  name,
  checked,
  disabled = false,
  onChange,
  title,
  badge,
  description,
}: StepChoiceCardProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const isChecked = checked && !disabled;

  return (
    <label
      htmlFor={id}
      css={css`
        display: flex;
        align-items: stretch;
        border: 1px solid ${isChecked ? euiTheme.colors.borderStrongPrimary : '#D6DDEA'};
        border-radius: 6px;
        background: ${isChecked ? euiTheme.colors.backgroundBasePrimary : euiTheme.colors.backgroundBasePlain};
        flex: 1 1 0;
        min-width: 0;
        cursor: ${disabled ? 'not-allowed' : 'pointer'};
        overflow: hidden;
        opacity: ${disabled ? 0.5 : 1};
        transition:
          border-color ${euiTheme.animation.fast} ease,
          background ${euiTheme.animation.fast} ease;
        &:hover {
          border-color: ${disabled ? '#D6DDEA' : euiTheme.colors.borderStrongPrimary};
        }
      `}
    >
      {/* Left strip — subdued background, control centered */}
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
        {control === 'radio' ? (
          <EuiRadio id={id} name={name} checked={isChecked} disabled={disabled} onChange={onChange} aria-label={title} />
        ) : (
          <EuiCheckbox id={id} checked={isChecked} disabled={disabled} onChange={onChange} aria-label={title} />
        )}
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
          justify-content: center;
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
            {title}
          </strong>
          {badge}
        </div>
        {description !== undefined && (
          <span
            css={css`
              font-size: 12.25px;
              color: ${euiTheme.colors.textSubdued};
              line-height: 16px;
            `}
          >
            {description}
          </span>
        )}
      </div>
    </label>
  );
};
