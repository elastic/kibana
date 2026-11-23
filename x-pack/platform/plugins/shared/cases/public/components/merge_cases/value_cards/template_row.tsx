/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { MergeCasesPreviewResponse, MergeTemplateOption } from '../../../../common/types/api';
import type { FieldStateKind } from './field_state';
import { FieldRow } from './field_row';
import type { ValueCardOption } from './value_card';
import { ValueCardGroup } from './value_card_group';
import * as i18n from './translations';

const NO_TEMPLATE_ID = '__none__';

interface TemplateRowProps {
  preview: MergeCasesPreviewResponse;
  /** `undefined` until the user picks; `null` is "No template". */
  choice: MergeTemplateOption | null | undefined;
  onChoose: (template: MergeTemplateOption | null) => void;
  state: FieldStateKind;
  /** Why the AI chose the value, until the user changes it. */
  aiReason?: string;
  isDisabled: boolean;
}

/**
 * A case has one template, so this is always a single choice. It comes first: it decides which
 * template fields the merged case has.
 */
export const TemplateRow: React.FC<TemplateRowProps> = ({
  preview,
  choice,
  onChoose,
  state,
  aiReason,
  isDisabled,
}) => {
  const { template, extendedFields, notCopiedFields } = preview.fields;

  const options = useMemo<ValueCardOption[]>(() => {
    const caseIdsByTemplate = new Map(
      template.options.flatMap(({ value, caseIds }) =>
        value != null ? [[value.id, caseIds] as const] : []
      )
    );
    return [
      ...template.candidates.map((candidate) => ({
        id: candidate.id,
        label: candidate.name,
        caseIds: caseIdsByTemplate.get(candidate.id) ?? [],
        searchText: candidate.name,
        invalid: candidate.isEnabled
          ? undefined
          : { code: 'notAnOption' as const, message: i18n.TEMPLATE_TURNED_OFF },
      })),
      {
        id: NO_TEMPLATE_ID,
        label: i18n.NO_TEMPLATE,
        caseIds: [],
        searchText: i18n.NO_TEMPLATE,
        help: i18n.NO_TEMPLATE_HELP,
      },
    ];
  }, [template.candidates, template.options]);

  const selectedId = choice === undefined ? undefined : choice?.id ?? NO_TEMPLATE_ID;
  const requiredFields = preview.conflicts.flatMap((conflict) =>
    conflict.field === 'extendedFields' && conflict.reason === 'required'
      ? [
          conflict.label ??
            extendedFields.find(({ key }) => key === conflict.key)?.label ??
            conflict.key ??
            '',
        ]
      : []
  );

  const consequences = [
    ...(requiredFields.length > 0
      ? [i18n.TEMPLATE_REQUIRED_FIELDS(requiredFields.length, requiredFields.join(', '))]
      : []),
    ...(notCopiedFields.length > 0
      ? [
          i18n.TEMPLATE_NOT_COPIED(
            notCopiedFields.length,
            notCopiedFields.map(({ label }) => label).join(', ')
          ),
        ]
      : []),
  ];

  return (
    <FieldRow fieldKey="template" label={i18n.TEMPLATE} state={state} aiReason={aiReason}>
      <ValueCardGroup
        fieldKey="template"
        legend={i18n.TEMPLATE}
        options={options}
        selectedId={selectedId}
        onSelect={(id) => {
          if (id === NO_TEMPLATE_ID) {
            onChoose(null);
            return;
          }
          const candidate = template.candidates.find((option) => option.id === id);
          if (candidate != null) {
            onChoose(candidate);
          }
        }}
        cases={preview.cases}
        isDisabled={isDisabled}
        footer={
          choice !== undefined && consequences.length > 0 ? (
            <KbnInfoCallout
              size="s"
              announceOnMount={false}
              title={consequences[0]}
              text={consequences[1]}
              data-test-subj="merge-template-consequences"
            />
          ) : null
        }
      />
    </FieldRow>
  );
};
TemplateRow.displayName = 'TemplateRow';
