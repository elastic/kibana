/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiRadio, EuiScreenReaderOnly, EuiText, useEuiTheme } from '@elastic/eui';
import type { MergeOptionIssue, MergePreviewCase } from '../../../../common/types/api';
import { CaseRefs } from './case_refs';

export interface ValueCardOption {
  /** Unique within its group. */
  id: string;
  label: React.ReactNode;
  /** The cases that hold the value. */
  caseIds: string[];
  /** Plain text for filtering and screen readers. */
  searchText: string;
  /** Set when the chosen template rejects the value; the card can't be picked. */
  invalid?: MergeOptionIssue;
  /** A line under the value, such as "Each under its case number". */
  help?: React.ReactNode;
}

interface ValueCardCssOptions {
  checked: boolean;
  disabled: boolean;
  /** The "Other …" card while it isn't picked. */
  dashed?: boolean;
}

/** A compact bordered card: the radio, the value and its case numbers on one line. */
const useValueCardCss = ({ checked, disabled, dashed = false }: ValueCardCssOptions) => {
  const { euiTheme } = useEuiTheme();
  const borderColor = checked
    ? euiTheme.colors.borderStrongPrimary
    : euiTheme.colors.borderBasePlain;
  const background = disabled
    ? euiTheme.colors.backgroundBaseDisabled
    : checked
    ? euiTheme.colors.backgroundBaseInteractiveSelect
    : euiTheme.colors.backgroundBasePlain;
  return css`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border: ${euiTheme.border.width.thin} ${dashed ? 'dashed' : 'solid'} ${borderColor};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${background};
    box-shadow: ${checked ? `0 0 0 ${euiTheme.border.width.thin} ${borderColor}` : 'none'};
    cursor: ${disabled ? 'not-allowed' : 'pointer'};
    ${!checked && !disabled
      ? `&:hover { background: ${euiTheme.colors.backgroundBaseInteractiveHover}; }`
      : ''}
  `;
};

/** Centres the 16px radio on the first 20px line of text. */
const radioCss = css`
  flex: none;
  margin-top: 2px;
`;

const bodyCss = css`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const valueCss = css`
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* Inline-flex values, such as a severity, would otherwise add a baseline gap under the line. */
  & > * {
    vertical-align: top;
  }
`;

const refsCss = css`
  display: flex;
  flex: none;
`;

interface ValueCardProps {
  groupName: string;
  option: ValueCardOption;
  checked: boolean;
  onSelect: (id: string) => void;
  cases: MergePreviewCase[];
  isDisabled?: boolean;
}

/** One distinct value of a field, with the cases that hold it. */
export const ValueCard: React.FC<ValueCardProps> = ({
  groupName,
  option,
  checked,
  onSelect,
  cases,
  isDisabled = false,
}) => {
  const id = `${groupName}-${option.id}`;
  const disabled = isDisabled || option.invalid != null;
  const cardCss = useValueCardCss({ checked, disabled });

  return (
    <label htmlFor={id} css={cardCss} data-test-subj={`merge-value-card-${groupName}-${option.id}`}>
      <EuiRadio
        id={id}
        name={groupName}
        value={option.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(option.id)}
        css={radioCss}
        data-test-subj={`merge-value-card-input-${groupName}-${option.id}`}
      />
      <EuiText size="s" component="span" css={bodyCss}>
        <span css={valueCss} title={option.searchText}>
          {option.label}
        </span>
        {option.help != null ? (
          <EuiText size="xs" color="subdued" component="span">
            {option.help}
          </EuiText>
        ) : null}
        {option.invalid != null ? (
          <EuiText
            size="xs"
            color="danger"
            component="span"
            data-test-subj="merge-value-card-invalid"
          >
            {option.invalid.message}
          </EuiText>
        ) : null}
      </EuiText>
      {option.caseIds.length > 0 ? (
        <span css={refsCss}>
          <CaseRefs caseIds={option.caseIds} cases={cases} />
        </span>
      ) : null}
    </label>
  );
};
ValueCard.displayName = 'ValueCard';

interface OtherValueCardProps {
  groupName: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  isDisabled?: boolean;
  /** The input, shown once the card is picked. */
  children?: React.ReactNode;
}

/**
 * The "Other …" option: a value no case holds. A dashed card until it's picked; then the input
 * takes the card's place beside the radio.
 */
export const OtherValueCard: React.FC<OtherValueCardProps> = ({
  groupName,
  label,
  checked,
  onSelect,
  isDisabled = false,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const id = `${groupName}-other`;
  const cardCss = useValueCardCss({ checked, disabled: isDisabled, dashed: !checked });
  const radio = (
    <EuiRadio
      id={id}
      name={groupName}
      value="other"
      checked={checked}
      disabled={isDisabled}
      onChange={onSelect}
      // Beside an input, the radio lines up with the input's 32px first line.
      css={[
        radioCss,
        checked
          ? css`
              margin-top: ${euiTheme.size.s};
            `
          : undefined,
      ]}
      data-test-subj={`merge-value-card-input-${groupName}-other`}
    />
  );

  if (!checked) {
    return (
      <label htmlFor={id} css={cardCss}>
        {radio}
        <EuiText size="s" color="subdued" component="span">
          {label}
        </EuiText>
      </label>
    );
  }

  return (
    <div css={[cardCss, { cursor: 'default' }]}>
      {radio}
      <EuiScreenReaderOnly>
        <label htmlFor={id}>{label}</label>
      </EuiScreenReaderOnly>
      <div
        css={css`
          flex: 1 1 auto;
          min-width: 0;
        `}
      >
        {children}
      </div>
    </div>
  );
};
OtherValueCard.displayName = 'OtherValueCard';
