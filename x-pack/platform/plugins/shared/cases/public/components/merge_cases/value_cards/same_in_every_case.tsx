/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEqual } from 'lodash';
import { EuiSuperSelect, EuiSwitch } from '@elastic/eui';
import {
  MAX_CATEGORY_LENGTH,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeCustomFieldPreview,
  MergeExtendedFieldPreview,
  MergeTemplateOption,
} from '../../../../common/types/api';
import type { CaseConnector } from '../../../../common/types/domain';
import { ConnectorTypes, CustomFieldTypes } from '../../../../common/types/domain';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { getNoneConnector } from '../../../../common/utils/connectors';
import { SeverityHealth, severities } from '../../severity/config';
import { SeveritySelector } from '../../severity/selector';
import { toSelectedUsers } from '../../templates_v2/field_types/controls/user_picker/utils';
import type {
  CustomFieldChoice,
  MergeFieldChoices,
  MergeFieldKey,
  MergeSingleFieldKey,
} from '../utils';
import { CombinedTagsField, countContributingCases } from './combined_field';
import { ConflictSection } from './conflict_section';
import { formatCustomValue, formatExtendedValue } from './field_rows';
import {
  OtherCategoryInput,
  OtherDateInput,
  OtherNumberInput,
  OtherSelectInput,
  OtherTextInput,
  OtherUserInput,
} from './other_value_card';
import type { SameValueEditor } from './same_value_row';
import { SameValueRow } from './same_value_row';
import * as i18n from './translations';

export interface SameInEveryCaseProps {
  preview: MergeCasesPreviewResponse;
  choices: MergeFieldChoices;
  /** The fields no case disagrees on, in the order they are listed. */
  fieldKeys: readonly MergeFieldKey[];
  isDisabled: boolean;
  onSetField: <K extends MergeSingleFieldKey>(key: K, value: MergeFieldChoices[K]) => void;
  onSetCustomField: (key: string, choice: CustomFieldChoice) => void;
  onSetExtendedField: (key: string, value: string) => void;
  onClearField: (key: MergeFieldKey) => void;
}

type RowContext = Omit<SameInEveryCaseProps, 'fieldKeys'>;

interface SameRow {
  key: MergeFieldKey;
  isChanged: boolean;
  node: React.ReactNode;
}

const NONE_ID = '__none__';
const SHARED_ID = 'shared';

const truncate = (value: string, length = 80) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

/** What the cases hold: "EMEA in all 4 cases", "EMEA in 3 of 4 cases", or the template's default. */
const describeShared = (
  { preview }: RowContext,
  text: string,
  { provenance, holders }: { provenance: string; holders: number }
): string => {
  const total = preview.cases.length;
  if (provenance === 'templateDefault') {
    return i18n.SAME_TEMPLATE_DEFAULT(text);
  }
  return holders >= total
    ? i18n.SAME_IN_ALL_CASES(text, total)
    : i18n.SAME_IN_SOME_CASES(text, holders, total);
};

const countHolders = (options: ReadonlyArray<{ caseIds: string[] }>): number =>
  options[0]?.caseIds.length ?? 0;

const sameRow = <D,>(
  ctx: RowContext,
  {
    key,
    label,
    value,
    sharedText,
    isChanged,
    editor,
  }: {
    key: MergeFieldKey;
    label: string;
    value: React.ReactNode;
    sharedText: string;
    isChanged: boolean;
    editor: SameValueEditor<D>;
  }
): SameRow => ({
  key,
  isChanged,
  node: (
    <SameValueRow<D>
      key={key}
      fieldKey={key}
      label={label}
      value={value}
      changedFrom={isChanged ? sharedText : undefined}
      editor={editor}
      onUndo={() => ctx.onClearField(key)}
      isDisabled={ctx.isDisabled}
    />
  ),
});

/** Saving the value the cases hold drops the user's value instead of repeating it. */
const saveSingle = <K extends MergeSingleFieldKey>(
  ctx: RowContext,
  key: K,
  value: MergeFieldChoices[K],
  isShared: boolean
) => (isShared ? ctx.onClearField(key) : ctx.onSetField(key, value));

const templateRow = (ctx: RowContext): SameRow | null => {
  const { template } = ctx.preview.fields;
  const shared = template.value;
  if (shared == null) {
    return null;
  }
  const value = ctx.choices.template !== undefined ? ctx.choices.template : shared;
  const isShared = (option: MergeTemplateOption | null) => option?.id === shared.id;
  const options = [
    ...template.candidates
      .filter(({ id, isEnabled }) => isEnabled || id === shared.id)
      .map(({ id, name }) => ({ value: id, inputDisplay: name })),
    { value: NONE_ID, inputDisplay: i18n.NO_TEMPLATE },
  ];
  return sameRow<MergeTemplateOption | null>(ctx, {
    key: 'template',
    label: i18n.TEMPLATE,
    value: value?.name ?? i18n.NO_TEMPLATE,
    sharedText: describeShared(ctx, shared.name, {
      provenance: template.provenance,
      holders: countHolders(template.options),
    }),
    isChanged: !isShared(value),
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => (
        <EuiSuperSelect
          compressed
          fullWidth
          options={options}
          valueOfSelected={draft?.id ?? NONE_ID}
          onChange={(id) =>
            onChange(template.candidates.find((option) => option.id === id) ?? null)
          }
          disabled={ctx.isDisabled}
          aria-label={i18n.OTHER_INPUT_ARIA(i18n.TEMPLATE)}
          data-test-subj="merge-same-input"
        />
      ),
      onSave: (draft) => saveSingle(ctx, 'template', draft, isShared(draft)),
    },
  });
};

const textRow = (ctx: RowContext, key: 'title' | 'description'): SameRow => {
  const field = ctx.preview.fields[key];
  const shared = field.value;
  const value = ctx.choices[key] ?? shared;
  const label = key === 'title' ? i18n.TITLE : i18n.DESCRIPTION;
  const maxLength = key === 'title' ? MAX_TITLE_LENGTH : MAX_DESCRIPTION_LENGTH;
  return sameRow<string>(ctx, {
    key,
    label,
    value: truncate(value),
    sharedText: describeShared(ctx, truncate(shared, 40), {
      provenance: field.provenance,
      holders: countHolders(field.options),
    }),
    isChanged: value !== shared,
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => (
        <OtherTextInput
          fieldLabel={label}
          value={draft}
          onChange={onChange}
          maxLength={maxLength}
          multiline={key === 'description'}
          isDisabled={ctx.isDisabled}
        />
      ),
      canSave: (draft) => draft.trim().length > 0 && draft.length <= maxLength,
      onSave: (draft) => {
        const next = key === 'title' ? draft.trim() : draft;
        saveSingle(ctx, key, next, next === shared);
      },
    },
  });
};

const severityRow = (ctx: RowContext): SameRow => {
  const { severity } = ctx.preview.fields;
  const shared = severity.value;
  const value = ctx.choices.severity ?? shared;
  return sameRow(ctx, {
    key: 'severity',
    label: i18n.SEVERITY,
    value: <SeverityHealth severity={value} />,
    sharedText: describeShared(ctx, severities[shared]?.label ?? shared, {
      provenance: severity.provenance,
      holders: countHolders(severity.options),
    }),
    isChanged: value !== shared,
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => (
        <SeveritySelector
          selectedSeverity={draft}
          onSeverityChange={onChange}
          isLoading={false}
          isDisabled={ctx.isDisabled}
        />
      ),
      onSave: (draft) => saveSingle(ctx, 'severity', draft, draft === shared),
    },
  });
};

const categoryRow = (ctx: RowContext): SameRow => {
  const { category } = ctx.preview.fields;
  const shared = category.value;
  const value = ctx.choices.category !== undefined ? ctx.choices.category : shared;
  return sameRow<string | null>(ctx, {
    key: 'category',
    label: i18n.CATEGORY,
    value: value ?? i18n.NOT_SET,
    sharedText: describeShared(ctx, shared ?? i18n.NOT_SET, {
      provenance: category.provenance,
      holders: countHolders(category.options),
    }),
    isChanged: value !== shared,
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => (
        <OtherCategoryInput value={draft} onChange={onChange} isDisabled={ctx.isDisabled} />
      ),
      onSave: (draft) => {
        const next = draft != null ? draft.slice(0, MAX_CATEGORY_LENGTH) : null;
        saveSingle(ctx, 'category', next, next === shared);
      },
    },
  });
};

const connectorRow = (ctx: RowContext): SameRow => {
  const { connector } = ctx.preview.fields;
  const shared = connector.value;
  const value = ctx.choices.connector ?? shared;
  const nameOf = (option: CaseConnector) =>
    option.type === ConnectorTypes.none ? i18n.NO_CONNECTOR : option.name;
  return sameRow<CaseConnector>(ctx, {
    key: 'connector',
    label: i18n.CONNECTOR,
    value: nameOf(value),
    sharedText: describeShared(ctx, shared.name, {
      provenance: connector.provenance,
      holders: countHolders(connector.options),
    }),
    isChanged: !isEqual(value, shared),
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => (
        <EuiSuperSelect
          compressed
          fullWidth
          options={[
            { value: SHARED_ID, inputDisplay: shared.name },
            { value: NONE_ID, inputDisplay: i18n.NO_CONNECTOR },
          ]}
          valueOfSelected={draft.type === ConnectorTypes.none ? NONE_ID : SHARED_ID}
          onChange={(id) => onChange(id === NONE_ID ? getNoneConnector() : shared)}
          disabled={ctx.isDisabled}
          aria-label={i18n.OTHER_INPUT_ARIA(i18n.CONNECTOR)}
          data-test-subj="merge-same-input"
        />
      ),
      onSave: (draft) => saveSingle(ctx, 'connector', draft, isEqual(draft, shared)),
    },
  });
};

const tagsRow = (ctx: RowContext): SameRow => {
  const { tags } = ctx.preview.fields;
  const shared = tags.value;
  const value = ctx.choices.tags ?? shared;
  const isShared = (next: string[]) => isEqual([...next].sort(), [...shared].sort());
  const format = (list: string[]) => (list.length > 0 ? truncate(list.join(', ')) : i18n.NOT_SET);
  return sameRow<string[]>(ctx, {
    key: 'tags',
    label: i18n.TAGS,
    value: format(value),
    sharedText: describeShared(ctx, truncate(shared.join(', '), 40), {
      provenance: tags.provenance,
      holders: countContributingCases(tags.items),
    }),
    isChanged: !isShared(value),
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => (
        <CombinedTagsField
          tags={draft}
          field={tags}
          onChange={onChange}
          isDisabled={ctx.isDisabled}
        />
      ),
      onSave: (draft) => saveSingle(ctx, 'tags', draft, isShared(draft)),
    },
  });
};

type CustomValue = CustomFieldChoice['value'];

const customEditor = (
  ctx: RowContext,
  field: MergeCustomFieldPreview,
  value: CustomValue
): SameValueEditor<string> => {
  const isEmpty = (draft: string) => draft.trim().length === 0;
  const save = (next: CustomValue) =>
    next === field.value
      ? ctx.onClearField(`customFields.${field.key}`)
      : ctx.onSetCustomField(field.key, { type: field.type, value: next });

  if (field.type === CustomFieldTypes.TOGGLE) {
    return {
      initialDraft: String(value === true),
      renderInput: (draft, onChange) => (
        <EuiSwitch
          compressed
          label={draft === 'true' ? i18n.TOGGLE_ON : i18n.TOGGLE_OFF}
          checked={draft === 'true'}
          onChange={(event) => onChange(String(event.target.checked))}
          disabled={ctx.isDisabled}
          data-test-subj="merge-same-input"
        />
      ),
      onSave: (draft) => save(draft === 'true'),
    };
  }

  if (field.type === CustomFieldTypes.NUMBER) {
    return {
      initialDraft: value != null ? String(value) : '',
      renderInput: (draft, onChange) => (
        <OtherNumberInput
          fieldLabel={field.label}
          value={draft}
          onChange={onChange}
          isDisabled={ctx.isDisabled}
        />
      ),
      canSave: (draft) => (isEmpty(draft) ? !field.required : !Number.isNaN(Number(draft))),
      onSave: (draft) => save(isEmpty(draft) ? null : Number(draft)),
    };
  }

  return {
    initialDraft: typeof value === 'string' ? value : '',
    renderInput: (draft, onChange) => (
      <OtherTextInput
        fieldLabel={field.label}
        value={draft}
        onChange={onChange}
        maxLength={MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}
        isDisabled={ctx.isDisabled}
      />
    ),
    canSave: (draft) =>
      (!field.required || !isEmpty(draft)) && draft.length <= MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
    onSave: (draft) => save(draft.length > 0 ? draft : null),
  };
};

const customFieldRow = (ctx: RowContext, field: MergeCustomFieldPreview): SameRow => {
  const choice = ctx.choices.customFields?.[field.key];
  const value = choice !== undefined ? choice.value : field.value;
  return sameRow(ctx, {
    key: `customFields.${field.key}`,
    label: field.label,
    value: formatCustomValue(field.type, value),
    sharedText: describeShared(ctx, formatCustomValue(field.type, field.value), {
      provenance: field.provenance,
      holders: countHolders(field.options),
    }),
    isChanged: value !== field.value,
    editor: customEditor(ctx, field, value),
  });
};

const isValidNumber = (draft: string, { min, max }: { min?: number; max?: number }) => {
  const numeric = Number(draft);
  return (
    !Number.isNaN(numeric) && (min == null || numeric >= min) && (max == null || numeric <= max)
  );
};

const renderExtendedInput = (
  ctx: RowContext,
  field: MergeExtendedFieldPreview,
  draft: string,
  onChange: (next: string) => void
): React.ReactNode => {
  const { definition, label } = field;
  switch (field.control) {
    case FieldType.INPUT_NUMBER:
      return (
        <OtherNumberInput
          fieldLabel={label}
          value={draft}
          onChange={onChange}
          min={definition.validation?.min}
          max={definition.validation?.max}
          isDisabled={ctx.isDisabled}
        />
      );
    case FieldType.DATE_PICKER:
      return (
        <OtherDateInput
          fieldLabel={label}
          value={draft}
          onChange={onChange}
          showTime={definition.metadata?.showTime}
          timezone={definition.metadata?.timezone}
          isDisabled={ctx.isDisabled}
        />
      );
    case FieldType.SELECT_BASIC:
    case FieldType.RADIO_GROUP:
      return (
        <OtherSelectInput
          fieldLabel={label}
          options={definition.options ?? []}
          value={draft}
          onChange={onChange}
          isDisabled={ctx.isDisabled}
        />
      );
    case FieldType.USER_PICKER: {
      const [user] = toSelectedUsers(draft);
      return (
        <OtherUserInput
          fieldLabel={label}
          value={user ?? null}
          onChange={(next) => onChange(next != null ? JSON.stringify([next]) : '')}
          isDisabled={ctx.isDisabled}
        />
      );
    }
    case FieldType.TOGGLE:
      return (
        <EuiSwitch
          compressed
          label={draft === 'true' ? i18n.TOGGLE_ON : i18n.TOGGLE_OFF}
          checked={draft === 'true'}
          onChange={(event) => onChange(String(event.target.checked))}
          disabled={ctx.isDisabled}
          data-test-subj="merge-same-input"
        />
      );
    default:
      return (
        <OtherTextInput
          fieldLabel={label}
          value={draft}
          onChange={onChange}
          maxLength={definition.validation?.maxLength}
          multiline={field.control === FieldType.TEXTAREA}
          isDisabled={ctx.isDisabled}
        />
      );
  }
};

const canSaveExtended = (field: MergeExtendedFieldPreview, draft: string): boolean => {
  if (draft.trim().length === 0) {
    return !field.required;
  }
  const { validation } = field.definition;
  if (field.control === FieldType.INPUT_NUMBER) {
    return isValidNumber(draft, { min: validation?.min, max: validation?.max });
  }
  return validation?.maxLength == null || draft.length <= validation.maxLength;
};

const extendedFieldRow = (ctx: RowContext, field: MergeExtendedFieldPreview): SameRow => {
  const value = ctx.choices.extendedFields?.[field.key] ?? field.value;
  const key: MergeFieldKey = `extendedFields.${field.key}`;
  return sameRow<string>(ctx, {
    key,
    label: field.label,
    value: formatExtendedValue(field, value),
    sharedText: describeShared(ctx, formatExtendedValue(field, field.value), {
      provenance: field.provenance,
      holders: countHolders(field.options),
    }),
    isChanged: value !== field.value,
    editor: {
      initialDraft: value,
      renderInput: (draft, onChange) => renderExtendedInput(ctx, field, draft, onChange),
      canSave: (draft) => canSaveExtended(field, draft),
      onSave: (draft) =>
        draft === field.value ? ctx.onClearField(key) : ctx.onSetExtendedField(field.key, draft),
    },
  });
};

const CUSTOM_PREFIX = 'customFields.';
const EXTENDED_PREFIX = 'extendedFields.';

const toRow = (ctx: RowContext, key: MergeFieldKey): SameRow | null => {
  const { fields } = ctx.preview;
  if (key.startsWith(CUSTOM_PREFIX)) {
    const field = fields.customFields.find(
      (custom) => custom.key === key.slice(CUSTOM_PREFIX.length)
    );
    return field != null ? customFieldRow(ctx, field) : null;
  }
  if (key.startsWith(EXTENDED_PREFIX)) {
    const field = fields.extendedFields.find(
      (extended) => extended.key === key.slice(EXTENDED_PREFIX.length)
    );
    return field != null ? extendedFieldRow(ctx, field) : null;
  }
  switch (key) {
    case 'template':
      return templateRow(ctx);
    case 'title':
    case 'description':
      return textRow(ctx, key);
    case 'severity':
      return severityRow(ctx);
    case 'category':
      return categoryRow(ctx);
    case 'connector':
      return connectorRow(ctx);
    case 'tags':
      return tagsRow(ctx);
    default:
      return null;
  }
};

/**
 * The fields no case disagrees on. The merged case keeps each value unless the user edits it, and
 * the section says how many the user changed. It opens on its own only when something is changed.
 */
export const SameInEveryCase: React.FC<SameInEveryCaseProps> = ({ fieldKeys, ...ctx }) => {
  const rows = fieldKeys.flatMap((key) => {
    const row = toRow(ctx, key);
    return row != null ? [row] : [];
  });
  if (rows.length === 0) {
    return null;
  }
  const changed = rows.filter(({ isChanged }) => isChanged).length;

  return (
    <ConflictSection
      title={i18n.SECTION_SAME}
      summary={
        changed > 0
          ? `${i18n.SECTION_FIELDS(rows.length)} · ${i18n.SECTION_CHANGED(changed)}`
          : i18n.SECTION_FIELDS(rows.length)
      }
      initialIsOpen={changed > 0}
      data-test-subj="merge-same-in-every-case"
    >
      {rows.map(({ node }) => node)}
    </ConflictSection>
  );
};
SameInEveryCase.displayName = 'SameInEveryCase';
