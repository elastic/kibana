/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { AiIcon } from '@kbn/ui-ai-components';
import type { MergeFieldKey } from '../utils';
import { revealInSection } from './conflict_section';
import type { FieldStateKind } from './field_state';
import * as i18n from './translations';

type StateColor = 'warning' | 'danger' | 'subdued' | 'success';

interface StateStyle {
  icon: string;
  color: StateColor;
}

const STATE_STYLES: Partial<Record<FieldStateKind, StateStyle>> = {
  chooseOne: { icon: 'warning', color: 'warning' },
  required: { icon: 'warning', color: 'warning' },
  overLimit: { icon: 'warning', color: 'warning' },
  invalid: { icon: 'error', color: 'danger' },
  combined: { icon: 'plusCircle', color: 'subdued' },
  locked: { icon: 'lock', color: 'subdued' },
  chosen: { icon: 'check', color: 'success' },
  own: { icon: 'check', color: 'success' },
};

const DEFAULT_STATE_TEXT: Partial<Record<FieldStateKind, string>> = {
  chooseOne: i18n.STATE_CHOOSE_ONE,
  invalid: i18n.STATE_NOT_VALID,
  required: i18n.STATE_REQUIRED,
  locked: i18n.STATE_LOCKED,
  chosen: i18n.STATE_CHOSEN,
  own: i18n.STATE_OWN,
};

/** The states that need fixing get a tint; a field that is simply not chosen yet does not. */
const getTint = (state: FieldStateKind, euiTheme: EuiThemeComputed): string | undefined => {
  switch (state) {
    case 'required':
    case 'overLimit':
      return euiTheme.colors.backgroundBaseWarning;
    case 'invalid':
      return euiTheme.colors.backgroundBaseDanger;
    default:
      return undefined;
  }
};

/** The element id of a field's row, so other steps and the progress bar can jump to it. */
export const getFieldRowId = (fieldKey: MergeFieldKey) => `merge-field-${fieldKey}`;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Opens a field's section if it's collapsed, then scrolls its row into view and focuses it. */
export const focusFieldRow = (
  fieldKey: MergeFieldKey,
  { smooth = false }: { smooth?: boolean } = {}
) => {
  const element = document.getElementById(getFieldRowId(fieldKey));
  if (element == null) {
    return;
  }
  revealInSection(element);
  element.scrollIntoView?.({
    block: 'center',
    behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
  });
  // Focusing scrolls instantly to an element out of view, which would cut a smooth scroll short.
  element.focus({ preventScroll: true });
};

const inlineCss = css`
  display: inline-flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
`;

const FieldState: React.FC<{ state: FieldStateKind; text?: string; byAi: boolean }> = ({
  state,
  text,
  byAi,
}) => {
  const { euiTheme } = useEuiTheme();
  if (byAi && (state === 'chosen' || state === 'own')) {
    return (
      <EuiText
        size="xs"
        color={euiTheme.colors.textAssistance}
        data-test-subj="merge-field-row-state"
      >
        <span css={inlineCss}>
          <AiIcon iconType="sparkles" size="s" aria-hidden={true} />
          {state === 'own' ? i18n.STATE_AI_WROTE : i18n.STATE_AI_CHOSE}
        </span>
      </EuiText>
    );
  }
  const style = STATE_STYLES[state];
  const label = text ?? DEFAULT_STATE_TEXT[state];
  if (label == null) {
    return null;
  }
  return (
    <EuiText size="xs" color={style?.color} data-test-subj="merge-field-row-state">
      <span css={inlineCss}>
        {style != null ? (
          <EuiIcon type={style.icon} size="s" color={style.color} aria-hidden={true} />
        ) : null}
        {label}
      </span>
    </EuiText>
  );
};
FieldState.displayName = 'FieldState';

const useRowCss = (state: FieldStateKind, verticalPadding: string) => {
  const { euiTheme } = useEuiTheme();
  return css`
    padding: ${verticalPadding} ${euiTheme.size.base};
    background: ${getTint(state, euiTheme) ?? 'transparent'};
    /* Only for keyboard focus: Safari and Firefox focus the row itself when a card is clicked. */
    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
      outline-offset: -${euiTheme.focus.width};
    }
  `;
};

export interface FieldRowProps {
  fieldKey: MergeFieldKey;
  label: string;
  state: FieldStateKind;
  /** Replaces the state's default words, such as "Required by Identity incident". */
  stateText?: string;
  /** Why the AI chose the value, shown until the user changes it. */
  aiReason?: string;
  children: React.ReactNode;
}

/**
 * One field on the Conflicts step: its label with its state on the right, the AI's reason when the
 * AI chose the value, and the choice below. Every state has words, so colour is never the only
 * signal.
 */
export const FieldRow: React.FC<FieldRowProps> = ({
  fieldKey,
  label,
  state,
  stateText,
  aiReason,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const rowCss = useRowCss(state, '14px');
  const byAi = aiReason != null;
  const text = stateText ?? DEFAULT_STATE_TEXT[state];

  return (
    <div
      id={getFieldRowId(fieldKey)}
      tabIndex={-1}
      role="group"
      aria-label={text != null ? `${label}: ${text}` : label}
      css={[
        rowCss,
        css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `,
      ]}
      data-test-subj={`merge-field-row-${fieldKey}`}
      data-merge-field-state={state}
      data-merge-field-ai={byAi ? 'true' : undefined}
    >
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: ${euiTheme.size.m};
        `}
      >
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
        <FieldState state={state} text={stateText} byAi={byAi} />
      </div>
      {byAi ? (
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-top: -${euiTheme.size.xs};
          `}
          data-test-subj="merge-field-ai-reason"
        >
          {aiReason}
        </EuiText>
      ) : null}
      <div
        css={css`
          min-width: 0;
        `}
      >
        {children}
      </div>
    </div>
  );
};
FieldRow.displayName = 'FieldRow';

export interface CombinedRowProps {
  fieldKey: MergeFieldKey;
  label: string;
  state: FieldStateKind;
  /** Words under the label, such as "Combined from 3 cases" or "Remove 3". */
  stateText?: string;
  children: React.ReactNode;
}

/**
 * A field whose values from every case are combined: the label and how it was combined on the left,
 * the combined values on the right. Nothing to choose unless it is over a limit.
 */
export const CombinedRow: React.FC<CombinedRowProps> = ({
  fieldKey,
  label,
  state,
  stateText,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const rowCss = useRowCss(state, euiTheme.size.m);
  const text = stateText ?? DEFAULT_STATE_TEXT[state];

  return (
    <div
      id={getFieldRowId(fieldKey)}
      tabIndex={-1}
      role="group"
      aria-label={text != null ? `${label}: ${text}` : label}
      css={[
        rowCss,
        css`
          display: grid;
          grid-template-columns: 140px minmax(0, 1fr);
          gap: ${euiTheme.size.m};
          align-items: start;
        `,
      ]}
      data-test-subj={`merge-field-row-${fieldKey}`}
      data-merge-field-state={state}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xxs};
          padding-top: ${euiTheme.size.xs};
          min-width: 0;
        `}
      >
        <EuiText size="s">
          <strong>{label}</strong>
        </EuiText>
        <FieldState state={state} text={stateText} byAi={false} />
      </div>
      <div
        css={css`
          min-width: 0;
        `}
      >
        {children}
      </div>
    </div>
  );
};
CombinedRow.displayName = 'CombinedRow';
