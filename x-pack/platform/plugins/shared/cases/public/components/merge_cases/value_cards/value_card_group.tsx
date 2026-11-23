/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import type { MergePreviewCase } from '../../../../common/types/api';
import type { MergeFieldKey } from '../utils';
import type { ValueCardOption } from './value_card';
import { OtherValueCard, ValueCard } from './value_card';
import * as i18n from './translations';

/** Up to this many values show as cards; past it, the first `MAX_VISIBLE_VALUES - 1` do. */
export const MAX_VISIBLE_VALUES = 5;

export interface OtherCardConfig {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  input: React.ReactNode;
}

export interface ValueCardGroupProps {
  fieldKey: MergeFieldKey;
  legend: string;
  options: ValueCardOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  cases: MergePreviewCase[];
  /** Text values sit one per line, full width; short values sit in one wrapping row. */
  layout?: 'list' | 'inline';
  moreLabel?: (count: number) => string;
  other?: OtherCardConfig;
  isDisabled?: boolean;
  footer?: React.ReactNode;
}

export const getGroupName = (fieldKey: MergeFieldKey) =>
  `merge-${fieldKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

/**
 * The distinct values of one field as a single choice. Nothing is picked until the user picks.
 * Many values collapse behind "Show N more", which shows the rest in place.
 */
export const ValueCardGroup: React.FC<ValueCardGroupProps> = ({
  fieldKey,
  legend,
  options,
  selectedId,
  onSelect,
  cases,
  layout = 'inline',
  moreLabel = i18n.SHOW_MORE_VALUES,
  other,
  isDisabled = false,
  footer,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const groupName = getGroupName(fieldKey);
  const overflows = options.length > MAX_VISIBLE_VALUES;

  const { visible, hiddenCount } = useMemo(() => {
    if (!overflows || isExpanded) {
      return { visible: options, hiddenCount: 0 };
    }
    const first = options.slice(0, MAX_VISIBLE_VALUES - 1);
    const rest = options.slice(MAX_VISIBLE_VALUES - 1);
    const selectedHidden = rest.find(({ id }) => id === selectedId);
    return selectedHidden != null
      ? { visible: [...first, selectedHidden], hiddenCount: rest.length - 1 }
      : { visible: first, hiddenCount: rest.length };
  }, [isExpanded, options, overflows, selectedId]);

  const isList = layout === 'list';
  const cardsCss = isList
    ? css`
        display: flex;
        flex-direction: column;
        gap: 6px;
      `
    : css`
        display: flex;
        flex-wrap: wrap;
        gap: ${euiTheme.size.s};
        & > * {
          flex: 0 1 auto;
          min-width: 0;
        }
      `;
  // A picked "Other" card holds an input, so it takes the full width of a row of short values.
  const otherWrapperCss =
    !isList && other?.isSelected
      ? css`
          flex-basis: 100%;
        `
      : undefined;

  const otherCard =
    other != null ? (
      <OtherValueCard
        groupName={groupName}
        label={other.label}
        checked={other.isSelected}
        onSelect={other.onSelect}
        isDisabled={isDisabled}
      >
        {other.input}
      </OtherValueCard>
    ) : null;

  return (
    <fieldset
      css={css`
        border: 0;
        margin: 0;
        padding: 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj={`merge-value-group-${fieldKey}`}
    >
      <legend className="euiScreenReaderOnly">{legend}</legend>
      <div css={cardsCss}>
        {visible.map((option) => (
          <ValueCard
            key={option.id}
            groupName={groupName}
            option={option}
            checked={selectedId === option.id}
            onSelect={onSelect}
            cases={cases}
            isDisabled={isDisabled}
          />
        ))}
        {!overflows && otherCard != null ? <div css={otherWrapperCss}>{otherCard}</div> : null}
      </div>
      {overflows ? (
        <div
          css={
            isList
              ? css`
                  display: flex;
                  flex-direction: column;
                  align-items: stretch;
                  gap: ${euiTheme.size.s};
                  & > button {
                    align-self: flex-start;
                  }
                `
              : css`
                  display: flex;
                  flex-wrap: wrap;
                  justify-content: space-between;
                  align-items: center;
                  gap: ${euiTheme.size.s};
                `
          }
        >
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType={isExpanded ? 'chevronSingleUp' : 'chevronSingleDown'}
            iconSide="right"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            data-test-subj="merge-value-group-show-more"
          >
            {isExpanded ? i18n.SHOW_FEWER : moreLabel(hiddenCount)}
          </EuiButtonEmpty>
          {otherCard != null ? <div css={otherWrapperCss}>{otherCard}</div> : null}
        </div>
      ) : null}
      {footer}
    </fieldset>
  );
};
ValueCardGroup.displayName = 'ValueCardGroup';
