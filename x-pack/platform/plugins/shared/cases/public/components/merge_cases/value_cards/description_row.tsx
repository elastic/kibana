/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import { i18n as kbnI18n } from '@kbn/i18n';
import { MAX_DESCRIPTION_LENGTH } from '../../../../common/constants';
import type { MergeCasesPreviewResponse } from '../../../../common/types/api';
import type { BlockingStateKind, FieldStateKind } from './field_state';
import { FieldRow } from './field_row';
import { getCaseRef } from './case_hover_card';
import { OtherTextInput } from './other_value_card';
import { NotSetOn } from './single_value_row';
import type { ValueCardOption } from './value_card';
import { ValueCardGroup } from './value_card_group';
import * as i18n from './translations';

/** Every distinct description, each under the numbers of the cases that hold it. */
export const getCombinedDescription = ({ cases, fields }: MergeCasesPreviewResponse): string => {
  if (fields.description.combinedValue != null) {
    return fields.description.combinedValue;
  }
  const casesById = new Map(cases.map((theCase) => [theCase.id, theCase]));
  return fields.description.options
    .map(({ value, caseIds }) => {
      const refs = caseIds.flatMap((caseId) => {
        const theCase = casesById.get(caseId);
        return theCase != null ? [getCaseRef(theCase)] : [];
      });
      const heading = kbnI18n.translate('xpack.cases.mergeCases.differences.description.heading', {
        values: { cases: refs.join(', ') },
        defaultMessage: 'From {cases}',
      });
      return `**${heading}**\n\n${value}`;
    })
    .join('\n\n---\n\n');
};

const excerptCss = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-line;
`;

/** The start of a case's description, as it is written. */
const DescriptionExcerpt: React.FC<{ value: string }> = ({ value }) =>
  value.trim().length === 0 ? (
    <EuiText size="s" color="subdued">
      {i18n.NOT_SET}
    </EuiText>
  ) : (
    <EuiText size="s" css={excerptCss} title={value}>
      {value}
    </EuiText>
  );
DescriptionExcerpt.displayName = 'DescriptionExcerpt';

interface DescriptionRowProps {
  preview: MergeCasesPreviewResponse;
  chosen: string | undefined;
  onChoose: (value: string) => void;
  blockingState?: BlockingStateKind;
  /** Why the AI chose the value, until the user changes it. */
  aiReason?: string;
  isDisabled: boolean;
}

/**
 * The description resolves like any text field: a card per case's value, and "Other description"
 * for your own, which starts from every case's description under its case numbers.
 */
export const DescriptionRow: React.FC<DescriptionRowProps> = ({
  preview,
  chosen,
  onChoose,
  blockingState,
  aiReason,
  isDisabled,
}) => {
  const { cases } = preview;
  const { options } = preview.fields.description;
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  const hasChoice = chosen !== undefined;
  const optionIndex = hasChoice ? options.findIndex(({ value }) => value === chosen) : -1;
  const isOwn = hasChoice && optionIndex < 0;
  const isOtherSelected = isOwn || isOtherOpen;
  const over = chosen != null ? chosen.length - MAX_DESCRIPTION_LENGTH : 0;
  const state: FieldStateKind =
    blockingState ?? (hasChoice ? (isOwn ? 'own' : 'chosen') : 'chooseOne');

  const cardOptions: ValueCardOption[] = options.map(({ value, caseIds }, index) => ({
    id: String(index),
    label: <DescriptionExcerpt value={value} />,
    caseIds,
    searchText: value,
  }));

  return (
    <FieldRow
      fieldKey="description"
      label={i18n.DESCRIPTION}
      state={state}
      stateText={over > 0 ? i18n.STATE_SHORTEN(over) : undefined}
      aiReason={aiReason}
    >
      <ValueCardGroup
        fieldKey="description"
        legend={i18n.DESCRIPTION}
        options={cardOptions}
        selectedId={!isOtherSelected && optionIndex >= 0 ? String(optionIndex) : undefined}
        onSelect={(id) => {
          setIsOtherOpen(false);
          onChoose(options[Number(id)].value);
        }}
        cases={cases}
        layout="list"
        moreLabel={i18n.SHOW_MORE_DESCRIPTIONS}
        isDisabled={isDisabled}
        other={{
          label: i18n.OTHER_DESCRIPTION,
          isSelected: isOtherSelected,
          onSelect: () => {
            setIsOtherOpen(true);
            // Your own description starts from all of them, unless you already wrote one.
            if (!isOwn) {
              onChoose(getCombinedDescription(preview));
            }
          },
          input: (
            <OtherTextInput
              fieldLabel={i18n.DESCRIPTION}
              value={chosen ?? ''}
              onChange={onChoose}
              maxLength={MAX_DESCRIPTION_LENGTH}
              multiline
              isDisabled={isDisabled}
            />
          ),
        }}
        footer={<NotSetOn caseIds={options.map(({ caseIds }) => caseIds)} cases={cases} />}
      />
    </FieldRow>
  );
};
DescriptionRow.displayName = 'DescriptionRow';
