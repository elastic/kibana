/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isEqual } from 'lodash';
import type { EuiComboBoxOptionOption, EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiPanel,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import {
  MAX_CATEGORY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeCustomFieldPreview,
  MergeExtendedFieldPreview,
  MergeFieldProvenance,
  MergePreviewCase,
  MergeTemplateOption,
} from '../../../common/types/api';
import type { CaseConnector } from '../../../common/types/domain';
import { ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { SeveritySelector } from '../severity/selector';
import { severities, SeverityHealth } from '../severity/config';
import { getName } from '../user_profiles/display_name';
import type { MergeFieldConflict, MergeFieldOption } from './merge_field_row';
import { MergeFieldRow } from './merge_field_row';
import { MergeSectionTitle } from './merge_section_title';
import type {
  CustomFieldChoice,
  CustomFieldValue,
  MergeFieldChoices,
  MergeFieldKey,
  MergeFieldValues,
  MergeSingleFieldKey,
} from './utils';
import { combineDescriptions, getCaseReference, getConflictKey } from './utils';
import * as i18n from './translations';

const OPTION_LABEL_MAX_LENGTH = 80;
const NO_TEMPLATE_VALUE = '';

const truncate = (value: string) =>
  value.length > OPTION_LABEL_MAX_LENGTH ? `${value.slice(0, OPTION_LABEL_MAX_LENGTH)}…` : value;

const getCaseRefs = (caseIds: string[], casesById: Map<string, MergePreviewCase>): string =>
  caseIds
    .flatMap((caseId) => {
      const theCase = casesById.get(caseId);
      return theCase ? [getCaseReference(theCase)] : [];
    })
    .join(', ');

/** Names where a value comes from, given the cases that hold it. */
const getProvenanceText = (
  provenance: MergeFieldProvenance,
  sourceCaseIds: string[],
  casesById: Map<string, MergePreviewCase>
): string => {
  switch (provenance) {
    case 'same':
      return i18n.SAME_IN_ALL_CASES;
    case 'highest':
      return i18n.HIGHEST;
    case 'combined':
      return i18n.COMBINED;
    case 'mostUsed':
      return i18n.MOST_USED;
    case 'templateDefault':
      return i18n.TEMPLATE_DEFAULT;
    case 'none':
      return i18n.NOT_SET;
    default: {
      if (sourceCaseIds.length > 1) {
        return i18n.FROM_CASES(sourceCaseIds.length);
      }
      const sourceCase = casesById.get(sourceCaseIds[0] ?? '');
      return sourceCase != null ? i18n.FROM_CASE(getCaseReference(sourceCase)) : '';
    }
  }
};

interface SingleFieldPreview<T> {
  value: T;
  provenance: MergeFieldProvenance;
  sourceCaseId: string | null;
  options: Array<{ value: T; caseIds: string[] }>;
}

/** Derives a single-value row's options, the selected option, and where its value comes from. */
const getSingleFieldRowState = <T,>({
  fieldPreview,
  currentValue,
  isChosen,
  casesById,
  getLabel,
}: {
  fieldPreview: SingleFieldPreview<T>;
  currentValue: T;
  isChosen: boolean;
  casesById: Map<string, MergePreviewCase>;
  getLabel: (value: T) => string;
}): { options: MergeFieldOption[]; selectedKey?: string; provenance: string } => {
  const options = fieldPreview.options.map(({ value, caseIds }, index) => ({
    key: String(index),
    label: truncate(getLabel(value)),
    caseRefs: getCaseRefs(caseIds, casesById),
  }));
  const selectedIndex = fieldPreview.options.findIndex(({ value }) => isEqual(value, currentValue));
  const selectedKey = selectedIndex >= 0 ? String(selectedIndex) : undefined;
  const selectedOption = fieldPreview.options[selectedIndex];

  if (!isChosen) {
    const sourceCaseIds =
      fieldPreview.sourceCaseId != null
        ? [fieldPreview.sourceCaseId]
        : selectedOption?.caseIds ?? [];
    return {
      options,
      selectedKey,
      provenance: getProvenanceText(fieldPreview.provenance, sourceCaseIds, casesById),
    };
  }

  return {
    options,
    selectedKey,
    provenance:
      selectedOption != null
        ? getProvenanceText('only', selectedOption.caseIds, casesById)
        : i18n.EDITED,
  };
};

const getConnectorLabel = (connector: CaseConnector): string =>
  connector.type === ConnectorTypes.none ? i18n.NO_CONNECTOR : connector.name;

const getTemplateLabel = (template: MergeTemplateOption | null): string =>
  template == null ? i18n.NO_TEMPLATE : template.name;

const getCustomFieldValueLabel = (type: string, value: CustomFieldValue): string => {
  if (value == null || value === '') {
    return i18n.EMPTY_VALUE;
  }
  if (type === CustomFieldTypes.TOGGLE) {
    return value === true ? i18n.TOGGLE_ON : i18n.TOGGLE_OFF;
  }
  return String(value);
};

const parseMultiValue = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return [value];
  }
};

const getExtendedFieldValueLabel = (
  { multiValue }: Pick<MergeExtendedFieldPreview, 'multiValue'>,
  value: string
): string => {
  if (value.length === 0) {
    return i18n.EMPTY_VALUE;
  }
  return multiValue ? parseMultiValue(value).join(', ') : value;
};

/** A text or number input that saves its value when it loses focus or the user presses Enter. */
const DraftInput = React.memo<{
  value: string;
  inputType: 'text' | 'number';
  onCommit: (value: string) => void;
  ariaLabel: string;
  isDisabled: boolean;
  'data-test-subj': string;
}>(({ value, inputType, onCommit, ariaLabel, isDisabled, 'data-test-subj': dataTestSubj }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = useCallback(() => {
    if (draft !== value) {
      onCommit(draft);
    }
  }, [draft, onCommit, value]);

  const inputProps = {
    fullWidth: true,
    compressed: true,
    value: draft,
    disabled: isDisabled,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    onBlur: commit,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commit();
      }
    },
    'aria-label': ariaLabel,
    'data-test-subj': dataTestSubj,
  };

  return inputType === 'number' ? (
    <EuiFieldNumber {...inputProps} />
  ) : (
    <EuiFieldText {...inputProps} />
  );
});
DraftInput.displayName = 'DraftInput';

interface MergeCaseDetailsSectionProps {
  preview: MergeCasesPreviewResponse;
  values: MergeFieldValues;
  choices: MergeFieldChoices;
  /** Fields whose conflict the user still has to resolve. */
  unresolvedKeys: ReadonlySet<MergeFieldKey>;
  onSetField: <K extends MergeSingleFieldKey>(field: K, value: MergeFieldChoices[K]) => void;
  onSetCustomField: (key: string, choice: CustomFieldChoice) => void;
  onSetExtendedField: (key: string, value: string) => void;
  /** Set when merging into one of the cases. */
  destinationRef?: string;
  showAssignees: boolean;
  isDisabled: boolean;
}

export const MergeCaseDetailsSection = React.memo<MergeCaseDetailsSectionProps>(
  ({
    preview,
    values: current,
    choices,
    unresolvedKeys,
    onSetField,
    onSetCustomField,
    onSetExtendedField,
    destinationRef,
    showAssignees,
    isDisabled,
  }) => {
    const [editingField, setEditingField] = useState<MergeFieldKey | null>(null);
    const toggleEdit = useCallback(
      (field: MergeFieldKey) => setEditingField((open) => (open === field ? null : field)),
      []
    );
    const casesById = useMemo(
      () => new Map(preview.cases.map((theCase) => [theCase.id, theCase])),
      [preview.cases]
    );
    const { data: userProfiles } = useBulkGetUserProfiles({
      uids: preview.fields.assignees.value.map(({ uid }) => uid),
    });
    const popoverTitle = (field: string) =>
      destinationRef != null
        ? i18n.POPOVER_TITLE_EXISTING_CASE(field, destinationRef)
        : i18n.POPOVER_TITLE_NEW_CASE(field);

    const { fields } = preview;
    const conflictKeys = useMemo(
      () => new Set(preview.conflicts.map((conflict) => getConflictKey(conflict))),
      [preview.conflicts]
    );
    const conflictMessages = useMemo(
      () =>
        new Map(
          preview.conflicts.flatMap((conflict) =>
            conflict.message != null && unresolvedKeys.has(getConflictKey(conflict))
              ? [[getConflictKey(conflict), conflict.message] as const]
              : []
          )
        ),
      [preview.conflicts, unresolvedKeys]
    );
    const totalConflicts = conflictKeys.size;
    const unresolvedCount = unresolvedKeys.size;

    const getConflict = (
      key: MergeFieldKey,
      onUseSuggestion?: () => void
    ): MergeFieldConflict | undefined =>
      conflictKeys.has(key) ? { isResolved: !unresolvedKeys.has(key), onUseSuggestion } : undefined;

    const rowProps = (key: MergeFieldKey) => ({
      isEditing: editingField === key,
      onToggleEdit: () => toggleEdit(key),
      isDisabled,
    });

    const title = getSingleFieldRowState({
      fieldPreview: fields.title,
      currentValue: current.title,
      isChosen: choices.title !== undefined,
      casesById,
      getLabel: (value) => value,
    });
    const severity = getSingleFieldRowState({
      fieldPreview: fields.severity,
      currentValue: current.severity,
      isChosen: choices.severity !== undefined,
      casesById,
      getLabel: (value) => severities[value].label,
    });
    const description = getSingleFieldRowState({
      fieldPreview: fields.description,
      currentValue: current.description,
      isChosen: choices.description !== undefined,
      casesById,
      getLabel: (value) => value,
    });
    const category = getSingleFieldRowState({
      fieldPreview: fields.category,
      currentValue: current.category,
      isChosen: choices.category !== undefined,
      casesById,
      getLabel: (value) => value ?? i18n.EMPTY_VALUE,
    });
    const connector = getSingleFieldRowState({
      fieldPreview: fields.connector,
      currentValue: current.connector,
      isChosen: choices.connector !== undefined,
      casesById,
      getLabel: getConnectorLabel,
    });
    const template = getSingleFieldRowState({
      fieldPreview: fields.template,
      currentValue: current.template,
      isChosen: choices.template !== undefined,
      casesById,
      getLabel: getTemplateLabel,
    });

    const templateEditorOptions = useMemo<Array<EuiSuperSelectOption<string>>>(
      () => [
        ...fields.template.candidates.map(({ id, name, isEnabled }) => ({
          value: id,
          inputDisplay: isEnabled ? name : `${name} (${i18n.TEMPLATE_DISABLED})`,
          disabled: !isEnabled,
          'data-test-subj': `merge-cases-template-option-${id}`,
        })),
        {
          value: NO_TEMPLATE_VALUE,
          inputDisplay: i18n.NO_TEMPLATE,
          'data-test-subj': 'merge-cases-template-option-none',
        },
      ],
      [fields.template.candidates]
    );

    const assigneeOptions: Array<EuiComboBoxOptionOption<string>> = fields.assignees.value.map(
      ({ uid }) => ({ label: getName(userProfiles?.get(uid)?.user), value: uid })
    );
    const tooManyAssignees = current.assignees.length - fields.assignees.max;
    const tooManyTags = current.tags.length - fields.tags.max;
    const assigneesUnavailableReason =
      fields.assignees.unavailableReason === 'license'
        ? i18n.ASSIGNEES_UNAVAILABLE_LICENSE
        : fields.assignees.unavailableReason === 'privilege'
        ? i18n.ASSIGNEES_UNAVAILABLE_PRIVILEGE
        : undefined;

    const renderCustomField = (field: MergeCustomFieldPreview) => {
      const key: MergeFieldKey = `customFields.${field.key}`;
      const chosen = choices.customFields?.[field.key];
      const value = chosen !== undefined ? chosen.value : field.value;
      const rowState = getSingleFieldRowState({
        fieldPreview: field,
        currentValue: value,
        isChosen: chosen !== undefined,
        casesById,
        getLabel: (optionValue) => getCustomFieldValueLabel(field.type, optionValue),
      });
      const setValue = (newValue: CustomFieldValue) =>
        onSetCustomField(field.key, { type: field.type, value: newValue });
      const message = conflictMessages.get(key);

      return (
        <MergeFieldRow
          key={key}
          label={field.label}
          value={getCustomFieldValueLabel(field.type, value)}
          provenance={rowState.provenance}
          conflict={getConflict(key, () => setValue(field.value))}
          isRequired={field.required}
          options={rowState.options}
          selectedKey={rowState.selectedKey}
          onSelectOption={(optionKey) => setValue(field.options[Number(optionKey)].value)}
          popoverTitle={popoverTitle(field.label)}
          {...rowProps(key)}
          helpText={
            message != null ? (
              <EuiText size="xs" color="danger">
                {message}
              </EuiText>
            ) : null
          }
          editor={
            field.type === CustomFieldTypes.TOGGLE ? (
              <EuiSwitch
                compressed
                label={field.label}
                checked={value === true}
                disabled={isDisabled}
                onChange={(event) => setValue(event.target.checked)}
                data-test-subj={`merge-cases-custom-field-${field.key}-input`}
              />
            ) : (
              <DraftInput
                value={value == null ? '' : String(value)}
                inputType={field.type === CustomFieldTypes.NUMBER ? 'number' : 'text'}
                onCommit={(newValue) => {
                  if (field.type === CustomFieldTypes.NUMBER) {
                    const parsed = Number(newValue);
                    setValue(newValue.trim().length === 0 || Number.isNaN(parsed) ? null : parsed);
                    return;
                  }
                  setValue(newValue.length > 0 ? newValue : null);
                }}
                ariaLabel={field.label}
                isDisabled={isDisabled}
                data-test-subj={`merge-cases-custom-field-${field.key}-input`}
              />
            )
          }
          data-test-subj={`merge-cases-field-custom-${field.key}`}
        />
      );
    };

    const renderExtendedField = (field: MergeExtendedFieldPreview) => {
      const key: MergeFieldKey = `extendedFields.${field.key}`;
      const chosen = choices.extendedFields?.[field.key];
      const value = chosen !== undefined ? chosen : field.value;
      const rowState = getSingleFieldRowState({
        fieldPreview: field,
        currentValue: value,
        isChosen: chosen !== undefined,
        casesById,
        getLabel: (optionValue) => getExtendedFieldValueLabel(field, optionValue),
      });
      const errors = [
        ...(conflictMessages.get(key) != null ? [conflictMessages.get(key) as string] : []),
        ...field.errors,
      ];
      const isInvalid = errors.length > 0 && unresolvedKeys.has(key);

      return (
        <MergeFieldRow
          key={key}
          label={field.label}
          value={getExtendedFieldValueLabel(field, value)}
          provenance={rowState.provenance}
          conflict={getConflict(key, () => onSetExtendedField(field.key, field.value))}
          isRequired={field.required}
          options={field.multiValue ? [] : rowState.options}
          selectedKey={rowState.selectedKey}
          onSelectOption={(optionKey) =>
            onSetExtendedField(field.key, field.options[Number(optionKey)].value)
          }
          popoverTitle={popoverTitle(field.label)}
          {...rowProps(key)}
          helpText={
            isInvalid ? (
              <EuiText
                size="xs"
                color="danger"
                data-test-subj={`merge-cases-field-ext-${field.key}-errors`}
              >
                {errors.length > 0 ? errors.join(' ') : i18n.INVALID_VALUE}
              </EuiText>
            ) : null
          }
          editor={
            field.multiValue ? undefined : (
              <DraftInput
                value={value}
                inputType="text"
                onCommit={(newValue) => onSetExtendedField(field.key, newValue)}
                ariaLabel={field.label}
                isDisabled={isDisabled}
                data-test-subj={`merge-cases-field-ext-${field.key}-input`}
              />
            )
          }
          data-test-subj={`merge-cases-field-ext-${field.key}`}
        />
      );
    };

    return (
      <>
        <MergeSectionTitle
          title={i18n.CASE_DETAILS_SECTION}
          badge={
            unresolvedCount > 0 ? (
              <EuiBadge
                color="warning"
                iconType="warning"
                data-test-subj="merge-cases-conflicts-badge"
              >
                {i18n.CONFLICTS_TO_RESOLVE(unresolvedCount)}
              </EuiBadge>
            ) : (
              <EuiBadge color="success" iconType="check" data-test-subj="merge-cases-no-conflicts">
                {totalConflicts > 0 ? i18n.CONFLICTS_RESOLVED : i18n.NO_CONFLICTS}
              </EuiBadge>
            )
          }
        />
        <EuiSpacer size="s" />
        <EuiPanel hasBorder paddingSize="none">
          <MergeFieldRow
            label={i18n.TITLE_FIELD}
            value={current.title}
            provenance={title.provenance}
            conflict={getConflict('title', () => onSetField('title', fields.title.value))}
            options={title.options}
            selectedKey={title.selectedKey}
            onSelectOption={(key) => onSetField('title', fields.title.options[Number(key)].value)}
            popoverTitle={popoverTitle(i18n.TITLE_FIELD)}
            {...rowProps('title')}
            editor={
              <EuiFieldText
                fullWidth
                compressed
                value={current.title}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(event) => onSetField('title', event.target.value)}
                aria-label={i18n.TITLE_FIELD}
                data-test-subj="merge-cases-title-input"
              />
            }
            data-test-subj="merge-cases-field-title"
          />
          <MergeFieldRow
            label={i18n.DESCRIPTION_FIELD}
            value={
              <div
                css={css`
                  display: -webkit-box;
                  -webkit-line-clamp: 3;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                  white-space: pre-wrap;
                `}
              >
                {current.description}
              </div>
            }
            provenance={description.provenance}
            conflict={getConflict('description', () =>
              onSetField('description', fields.description.value)
            )}
            options={description.options}
            selectedKey={description.selectedKey}
            onSelectOption={(key) =>
              onSetField('description', fields.description.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.DESCRIPTION_FIELD)}
            renderPopoverActions={(closePopover) => (
              <EuiButtonEmpty
                size="xs"
                iconType="merge"
                onClick={() => {
                  onSetField('description', combineDescriptions(preview));
                  closePopover();
                }}
                data-test-subj="merge-cases-combine-descriptions"
              >
                {i18n.COMBINE_DESCRIPTIONS}
              </EuiButtonEmpty>
            )}
            {...rowProps('description')}
            helpText={
              current.description.length > MAX_DESCRIPTION_LENGTH ? (
                <EuiText size="xs" color="danger">
                  {i18n.DESCRIPTION_TOO_LONG(MAX_DESCRIPTION_LENGTH)}
                </EuiText>
              ) : null
            }
            editor={
              <EuiTextArea
                fullWidth
                compressed
                rows={6}
                value={current.description}
                onChange={(event) => onSetField('description', event.target.value)}
                aria-label={i18n.DESCRIPTION_FIELD}
                data-test-subj="merge-cases-description-input"
              />
            }
            data-test-subj="merge-cases-field-description"
          />
          <MergeFieldRow
            label={i18n.SEVERITY_FIELD}
            value={<SeverityHealth severity={current.severity} />}
            provenance={severity.provenance}
            conflict={getConflict('severity', () => onSetField('severity', fields.severity.value))}
            options={severity.options}
            selectedKey={severity.selectedKey}
            onSelectOption={(key) =>
              onSetField('severity', fields.severity.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.SEVERITY_FIELD)}
            {...rowProps('severity')}
            editor={
              <SeveritySelector
                selectedSeverity={current.severity}
                onSeverityChange={(value) => onSetField('severity', value)}
                isLoading={false}
                isDisabled={isDisabled}
              />
            }
            data-test-subj="merge-cases-field-severity"
          />
          <MergeFieldRow
            label={i18n.CATEGORY_FIELD}
            value={current.category ?? i18n.EMPTY_VALUE}
            provenance={category.provenance}
            conflict={getConflict('category', () => onSetField('category', fields.category.value))}
            options={category.options}
            selectedKey={category.selectedKey}
            onSelectOption={(key) =>
              onSetField('category', fields.category.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.CATEGORY_FIELD)}
            {...rowProps('category')}
            editor={
              <EuiFieldText
                fullWidth
                compressed
                value={current.category ?? ''}
                maxLength={MAX_CATEGORY_LENGTH}
                onChange={(event) =>
                  onSetField(
                    'category',
                    event.target.value.trim().length > 0 ? event.target.value : null
                  )
                }
                aria-label={i18n.CATEGORY_FIELD}
                data-test-subj="merge-cases-category-input"
              />
            }
            data-test-subj="merge-cases-field-category"
          />
          <MergeFieldRow
            label={i18n.TAGS_FIELD}
            value={
              current.tags.length > 0 ? (
                <EuiBadgeGroup gutterSize="xs">
                  {current.tags.map((tag) => (
                    <EuiBadge key={tag} color="hollow">
                      {tag}
                    </EuiBadge>
                  ))}
                </EuiBadgeGroup>
              ) : (
                i18n.EMPTY_VALUE
              )
            }
            provenance={
              choices.tags !== undefined
                ? i18n.EDITED
                : getProvenanceText(fields.tags.provenance, [], casesById)
            }
            {...rowProps('tags')}
            helpText={
              tooManyTags > 0 ? (
                <EuiText size="xs" color="danger">
                  {i18n.BLOCKED_TOO_MANY_TAGS(tooManyTags)}
                </EuiText>
              ) : null
            }
            editor={
              <EuiComboBox
                fullWidth
                compressed
                noSuggestions
                aria-label={i18n.TAGS_FIELD}
                selectedOptions={current.tags.map((tag) => ({ label: tag }))}
                onChange={(selected) =>
                  onSetField(
                    'tags',
                    selected.map(({ label }) => label)
                  )
                }
                onCreateOption={(tag) => {
                  const trimmed = tag.trim();
                  if (trimmed.length > 0 && !current.tags.includes(trimmed)) {
                    onSetField('tags', [...current.tags, trimmed]);
                  }
                }}
                data-test-subj="merge-cases-tags-input"
              />
            }
            data-test-subj="merge-cases-field-tags"
          />
          {showAssignees ? (
            <MergeFieldRow
              label={i18n.ASSIGNEES_FIELD}
              value={
                current.assignees.length > 0
                  ? current.assignees
                      .map(({ uid }) => getName(userProfiles?.get(uid)?.user))
                      .join(', ')
                  : i18n.EMPTY_VALUE
              }
              provenance={
                choices.assignees !== undefined
                  ? i18n.EDITED
                  : getProvenanceText(fields.assignees.provenance, [], casesById)
              }
              {...rowProps('assignees')}
              helpText={
                assigneesUnavailableReason != null ? (
                  <EuiText size="xs" color="subdued">
                    {assigneesUnavailableReason}
                  </EuiText>
                ) : tooManyAssignees > 0 ? (
                  <EuiText size="xs" color="danger">
                    {i18n.ASSIGNEES_OVER_LIMIT(fields.assignees.max, tooManyAssignees)}
                  </EuiText>
                ) : null
              }
              editor={
                fields.assignees.canChange ? (
                  <EuiComboBox
                    fullWidth
                    compressed
                    aria-label={i18n.ASSIGNEES_FIELD}
                    options={assigneeOptions}
                    selectedOptions={assigneeOptions.filter(({ value }) =>
                      current.assignees.some(({ uid }) => uid === value)
                    )}
                    onChange={(selected) =>
                      onSetField(
                        'assignees',
                        selected.flatMap(({ value }) => (value != null ? [{ uid: value }] : []))
                      )
                    }
                    data-test-subj="merge-cases-assignees-input"
                  />
                ) : undefined
              }
              data-test-subj="merge-cases-field-assignees"
            />
          ) : null}
          <MergeFieldRow
            label={i18n.CONNECTOR_FIELD}
            value={getConnectorLabel(current.connector)}
            provenance={connector.provenance}
            conflict={getConflict('connector', () =>
              onSetField('connector', fields.connector.value)
            )}
            options={connector.options}
            selectedKey={connector.selectedKey}
            onSelectOption={(key) =>
              onSetField('connector', fields.connector.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.CONNECTOR_FIELD)}
            {...rowProps('connector')}
            data-test-subj="merge-cases-field-connector"
          />
          <MergeFieldRow
            label={i18n.TEMPLATE_FIELD}
            value={getTemplateLabel(current.template)}
            provenance={template.provenance}
            conflict={getConflict('template', () => onSetField('template', fields.template.value))}
            options={template.options}
            selectedKey={template.selectedKey}
            onSelectOption={(key) =>
              onSetField('template', fields.template.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.TEMPLATE_FIELD)}
            renderPopoverActions={(closePopover) => (
              <EuiButtonEmpty
                size="xs"
                onClick={() => {
                  onSetField('template', null);
                  closePopover();
                }}
                data-test-subj="merge-cases-no-template"
              >
                {i18n.NO_TEMPLATE}
              </EuiButtonEmpty>
            )}
            {...rowProps('template')}
            editor={
              <EuiSuperSelect
                fullWidth
                compressed
                options={templateEditorOptions}
                valueOfSelected={current.template?.id ?? NO_TEMPLATE_VALUE}
                onChange={(id) => {
                  if (id === NO_TEMPLATE_VALUE) {
                    onSetField('template', null);
                    return;
                  }
                  const candidate = fields.template.candidates.find((option) => option.id === id);
                  if (candidate != null) {
                    onSetField('template', candidate);
                  }
                }}
                disabled={isDisabled}
                aria-label={i18n.TEMPLATE_FIELD}
                data-test-subj="merge-cases-template-input"
              />
            }
            data-test-subj="merge-cases-field-template"
          />
          {fields.customFields.map(renderCustomField)}
          {fields.extendedFields.map(renderExtendedField)}
        </EuiPanel>
        {fields.notCopiedFields.length > 0 ? (
          <>
            <EuiSpacer size="s" />
            <KbnInfoCallout
              announceOnMount={false}
              size="s"
              title={i18n.NOT_COPIED_FIELDS(
                fields.notCopiedFields.map(({ label }) => label).join(', ')
              )}
              data-test-subj="merge-cases-not-copied-fields"
            />
          </>
        ) : null}
      </>
    );
  }
);
MergeCaseDetailsSection.displayName = 'MergeCaseDetailsSection';
