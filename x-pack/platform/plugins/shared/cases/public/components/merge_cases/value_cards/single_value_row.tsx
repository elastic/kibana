/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { isEqual } from 'lodash';
import { EuiText } from '@elastic/eui';
import type { MergeOptionIssue, MergePreviewCase } from '../../../../common/types/api';
import type { MergeFieldKey } from '../utils';
import type { BlockingStateKind, FieldStateKind } from './field_state';
import { FieldRow } from './field_row';
import { getCaseRef } from './case_hover_card';
import type { ValueCardOption } from './value_card';
import { ValueCardGroup } from './value_card_group';
import * as i18n from './translations';

export interface SingleValueOption<T> {
  value: T;
  caseIds: string[];
  invalid?: MergeOptionIssue;
}

export interface SingleValueRowProps<T> {
  fieldKey: MergeFieldKey;
  label: string;
  options: Array<SingleValueOption<T>>;
  /** `undefined` until the user acts on the field. */
  chosen: T | undefined;
  hasChoice: boolean;
  onChoose: (value: T) => void;
  renderValue: (value: T) => React.ReactNode;
  toText: (value: T) => string;
  blockingState?: BlockingStateKind;
  stateText?: string;
  /** Why the AI chose the value, until the user changes it. */
  aiReason?: string;
  layout?: 'list' | 'inline';
  moreLabel?: (count: number) => string;
  other?: {
    label: string;
    /** The input inside the "Other …" card. `value` is the user's own value, if any. */
    renderInput: (value: T | undefined) => React.ReactNode;
  };
  cases: MergePreviewCase[];
  isDisabled: boolean;
}

/** The cases that hold no value for a field, named under its cards. */
export const NotSetOn: React.FC<{ caseIds: string[][]; cases: MergePreviewCase[] }> = ({
  caseIds,
  cases,
}) => {
  const holding = new Set(caseIds.flat());
  const notSet = cases.filter(({ id }) => !holding.has(id));
  return notSet.length > 0 && notSet.length < cases.length ? (
    <EuiText size="xs" color="subdued" data-test-subj="merge-field-not-set-on">
      {i18n.NOT_SET_ON(notSet.map(getCaseRef).join(', '))}
    </EuiText>
  ) : null;
};
NotSetOn.displayName = 'NotSetOn';

/**
 * A field with one value per case: a card per distinct value, nothing picked until the user
 * picks, and an "Other …" card for a value no case holds.
 */
export const SingleValueRow = <T,>({
  fieldKey,
  label,
  options,
  chosen,
  hasChoice,
  onChoose,
  renderValue,
  toText,
  blockingState,
  stateText,
  aiReason,
  layout = 'inline',
  moreLabel,
  other,
  cases,
  isDisabled,
}: SingleValueRowProps<T>) => {
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const selectedIndex = hasChoice ? options.findIndex(({ value }) => isEqual(value, chosen)) : -1;
  const isOwn = hasChoice && selectedIndex < 0;
  // "Other" stays picked once opened, even while its input still holds a case's value.
  const isOtherSelected = other != null && (isOwn || isOtherOpen);
  const state: FieldStateKind =
    blockingState ?? (hasChoice ? (isOwn ? 'own' : 'chosen') : 'chooseOne');

  const cardOptions: ValueCardOption[] = options.map(({ value, caseIds, invalid }, index) => ({
    id: String(index),
    label: renderValue(value),
    caseIds,
    searchText: toText(value),
    invalid,
  }));

  return (
    <FieldRow
      fieldKey={fieldKey}
      label={label}
      state={state}
      stateText={stateText}
      aiReason={aiReason}
    >
      <ValueCardGroup
        fieldKey={fieldKey}
        legend={label}
        options={cardOptions}
        selectedId={!isOtherSelected && selectedIndex >= 0 ? String(selectedIndex) : undefined}
        onSelect={(id) => {
          setIsOtherOpen(false);
          onChoose(options[Number(id)].value);
        }}
        cases={cases}
        layout={layout}
        moreLabel={moreLabel}
        isDisabled={isDisabled}
        other={
          other != null
            ? {
                label: other.label,
                isSelected: isOtherSelected,
                onSelect: () => setIsOtherOpen(true),
                // Opened over a case's value, the input starts from that value.
                input: other.renderInput(isOtherSelected ? chosen : undefined),
              }
            : undefined
        }
        footer={<NotSetOn caseIds={options.map(({ caseIds }) => caseIds)} cases={cases} />}
      />
    </FieldRow>
  );
};
SingleValueRow.displayName = 'SingleValueRow';
