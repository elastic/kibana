/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  MAX_CATEGORY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeFieldProvenance,
  MergePreviewCase,
} from '../../../common/types/api';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { SeveritySelector } from '../severity/selector';
import { severities, SeverityHealth } from '../severity/config';
import { getName } from '../user_profiles/display_name';
import type { MergeFieldOption } from './merge_field_row';
import { MergeFieldRow } from './merge_field_row';
import { MergeSectionTitle } from './merge_section_title';
import type { MergeFieldOverrides, MergeFieldValues } from './utils';
import { combineDescriptions, getCaseReference, getConflictCount } from './utils';
import * as i18n from './translations';

const OPTION_LABEL_MAX_LENGTH = 80;

type EditableField = keyof MergeFieldValues;

interface SingleFieldPreview<T> {
  value: T;
  provenance: MergeFieldProvenance;
  sourceCaseId: string | null;
  options: Array<{ value: T; caseIds: string[] }>;
}

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

/** Derives a single-value row's options, the selected option, and where its value comes from. */
const getSingleFieldRowState = <T,>({
  fieldPreview,
  currentValue,
  isOverridden,
  casesById,
  getLabel,
}: {
  fieldPreview: SingleFieldPreview<T>;
  currentValue: T;
  isOverridden: boolean;
  casesById: Map<string, MergePreviewCase>;
  getLabel: (value: T) => string;
}): { options: MergeFieldOption[]; selectedKey?: string; provenance: string } => {
  const options = fieldPreview.options.map(({ value, caseIds }, index) => ({
    key: String(index),
    label: truncate(getLabel(value)),
    caseRefs: getCaseRefs(caseIds, casesById),
  }));
  const selectedIndex = fieldPreview.options.findIndex(({ value }) => value === currentValue);
  const selectedKey = selectedIndex >= 0 ? String(selectedIndex) : undefined;

  if (!isOverridden) {
    const sourceCaseIds =
      fieldPreview.sourceCaseId != null
        ? [fieldPreview.sourceCaseId]
        : fieldPreview.options[selectedIndex]?.caseIds ?? [];
    return {
      options,
      selectedKey,
      provenance: getProvenanceText(fieldPreview.provenance, sourceCaseIds, casesById),
    };
  }

  const selectedOption = fieldPreview.options[selectedIndex];

  return {
    options,
    selectedKey,
    provenance:
      selectedOption != null
        ? getProvenanceText('only', selectedOption.caseIds, casesById)
        : i18n.EDITED,
  };
};

interface MergeCaseDetailsSectionProps {
  preview: MergeCasesPreviewResponse;
  values: MergeFieldValues;
  overrides: MergeFieldOverrides;
  onChange: <K extends EditableField>(field: K, value: MergeFieldValues[K]) => void;
  /** Set when merging into one of the cases. */
  destinationRef?: string;
  showAssignees: boolean;
  isDisabled: boolean;
}

export const MergeCaseDetailsSection = React.memo<MergeCaseDetailsSectionProps>(
  ({
    preview: currentPreview,
    values: current,
    overrides,
    onChange: setOverride,
    destinationRef,
    showAssignees,
    isDisabled: isControlsDisabled,
  }) => {
    const [editingField, setEditingField] = useState<EditableField | null>(null);
    const toggleEdit = useCallback(
      (field: EditableField) => setEditingField((open) => (open === field ? null : field)),
      []
    );
    const casesById = useMemo(
      () => new Map(currentPreview.cases.map((theCase) => [theCase.id, theCase])),
      [currentPreview.cases]
    );
    const { data: userProfiles } = useBulkGetUserProfiles({
      uids: currentPreview.fields.assignees.value.map(({ uid }) => uid),
    });
    const popoverTitle = (field: string) =>
      destinationRef != null
        ? i18n.POPOVER_TITLE_EXISTING_CASE(field, destinationRef)
        : i18n.POPOVER_TITLE_NEW_CASE(field);

    const { fields } = currentPreview;
    const conflictCount = getConflictCount(currentPreview);

    const title = getSingleFieldRowState({
      fieldPreview: fields.title,
      currentValue: current.title,
      isOverridden: overrides.title !== undefined,
      casesById,
      getLabel: (value) => value,
    });
    const severity = getSingleFieldRowState({
      fieldPreview: fields.severity,
      currentValue: current.severity,
      isOverridden: overrides.severity !== undefined,
      casesById,
      getLabel: (value) => severities[value].label,
    });
    const description = getSingleFieldRowState({
      fieldPreview: fields.description,
      currentValue: current.description,
      isOverridden: overrides.description !== undefined,
      casesById,
      getLabel: (value) => value,
    });
    const category = getSingleFieldRowState({
      fieldPreview: fields.category,
      currentValue: current.category,
      isOverridden: overrides.category !== undefined,
      casesById,
      getLabel: (value) => value ?? i18n.EMPTY_VALUE,
    });

    const assigneeOptions: Array<EuiComboBoxOptionOption<string>> = fields.assignees.value.map(
      ({ uid }) => ({ label: getName(userProfiles?.get(uid)?.user), value: uid })
    );
    const tooManyAssignees = current.assignees.length - fields.assignees.max;

    return (
      <>
        <MergeSectionTitle
          title={i18n.CASE_DETAILS_SECTION}
          badge={
            conflictCount > 0 ? (
              <EuiBadge color="warning" data-test-subj="merge-cases-conflicts-badge">
                {i18n.TO_REVIEW(conflictCount)}
              </EuiBadge>
            ) : (
              <EuiBadge color="success" iconType="check" data-test-subj="merge-cases-no-conflicts">
                {i18n.NO_CONFLICTS}
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
            hasConflict={fields.title.hasConflict}
            options={title.options}
            selectedKey={title.selectedKey}
            onSelectOption={(key) => setOverride('title', fields.title.options[Number(key)].value)}
            popoverTitle={popoverTitle(i18n.TITLE_FIELD)}
            isEditing={editingField === 'title'}
            onToggleEdit={() => toggleEdit('title')}
            isDisabled={isControlsDisabled}
            editor={
              <EuiFieldText
                fullWidth
                compressed
                value={current.title}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(event) => setOverride('title', event.target.value)}
                aria-label={i18n.TITLE_FIELD}
                data-test-subj="merge-cases-title-input"
              />
            }
            data-test-subj="merge-cases-field-title"
          />
          <MergeFieldRow
            label={i18n.SEVERITY_FIELD}
            value={<SeverityHealth severity={current.severity} />}
            provenance={severity.provenance}
            hasConflict={fields.severity.hasConflict}
            options={severity.options}
            selectedKey={severity.selectedKey}
            onSelectOption={(key) =>
              setOverride('severity', fields.severity.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.SEVERITY_FIELD)}
            isEditing={editingField === 'severity'}
            onToggleEdit={() => toggleEdit('severity')}
            isDisabled={isControlsDisabled}
            editor={
              <SeveritySelector
                selectedSeverity={current.severity}
                onSeverityChange={(value) => setOverride('severity', value)}
                isLoading={false}
                isDisabled={isControlsDisabled}
              />
            }
            data-test-subj="merge-cases-field-severity"
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
            hasConflict={fields.description.hasConflict}
            options={description.options}
            selectedKey={description.selectedKey}
            onSelectOption={(key) =>
              setOverride('description', fields.description.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.DESCRIPTION_FIELD)}
            renderPopoverActions={(closePopover) => (
              <EuiButtonEmpty
                size="xs"
                iconType="merge"
                onClick={() => {
                  setOverride('description', combineDescriptions(currentPreview));
                  closePopover();
                }}
                data-test-subj="merge-cases-combine-descriptions"
              >
                {i18n.COMBINE_DESCRIPTIONS}
              </EuiButtonEmpty>
            )}
            isEditing={editingField === 'description'}
            onToggleEdit={() => toggleEdit('description')}
            isDisabled={isControlsDisabled}
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
                onChange={(event) => setOverride('description', event.target.value)}
                aria-label={i18n.DESCRIPTION_FIELD}
                data-test-subj="merge-cases-description-input"
              />
            }
            data-test-subj="merge-cases-field-description"
          />
          <MergeFieldRow
            label={i18n.CATEGORY_FIELD}
            value={current.category ?? i18n.EMPTY_VALUE}
            provenance={category.provenance}
            hasConflict={fields.category.hasConflict}
            options={category.options}
            selectedKey={category.selectedKey}
            onSelectOption={(key) =>
              setOverride('category', fields.category.options[Number(key)].value)
            }
            popoverTitle={popoverTitle(i18n.CATEGORY_FIELD)}
            isEditing={editingField === 'category'}
            onToggleEdit={() => toggleEdit('category')}
            isDisabled={isControlsDisabled}
            editor={
              <EuiFieldText
                fullWidth
                compressed
                value={current.category ?? ''}
                maxLength={MAX_CATEGORY_LENGTH}
                onChange={(event) =>
                  setOverride(
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
              overrides.tags !== undefined
                ? i18n.EDITED
                : getProvenanceText(fields.tags.provenance, [], casesById)
            }
            hasConflict={false}
            isEditing={editingField === 'tags'}
            onToggleEdit={() => toggleEdit('tags')}
            isDisabled={isControlsDisabled}
            editor={
              <EuiComboBox
                fullWidth
                compressed
                noSuggestions
                aria-label={i18n.TAGS_FIELD}
                selectedOptions={current.tags.map((tag) => ({ label: tag }))}
                onChange={(selected) =>
                  setOverride(
                    'tags',
                    selected.map(({ label }) => label)
                  )
                }
                onCreateOption={(tag) => {
                  const trimmed = tag.trim();
                  if (trimmed.length > 0 && !current.tags.includes(trimmed)) {
                    setOverride('tags', [...current.tags, trimmed]);
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
                overrides.assignees !== undefined
                  ? i18n.EDITED
                  : getProvenanceText(fields.assignees.provenance, [], casesById)
              }
              hasConflict={false}
              isEditing={editingField === 'assignees'}
              onToggleEdit={() => toggleEdit('assignees')}
              isDisabled={isControlsDisabled}
              helpText={
                tooManyAssignees > 0 ? (
                  <EuiText size="xs" color="danger">
                    {i18n.ASSIGNEES_OVER_LIMIT(fields.assignees.max, tooManyAssignees)}
                  </EuiText>
                ) : null
              }
              editor={
                <EuiComboBox
                  fullWidth
                  compressed
                  aria-label={i18n.ASSIGNEES_FIELD}
                  options={assigneeOptions}
                  selectedOptions={assigneeOptions.filter(({ value }) =>
                    current.assignees.some(({ uid }) => uid === value)
                  )}
                  onChange={(selected) =>
                    setOverride(
                      'assignees',
                      selected.flatMap(({ value }) => (value != null ? [{ uid: value }] : []))
                    )
                  }
                  data-test-subj="merge-cases-assignees-input"
                />
              }
              data-test-subj="merge-cases-field-assignees"
            />
          ) : null}
        </EuiPanel>
      </>
    );
  }
);
MergeCaseDetailsSection.displayName = 'MergeCaseDetailsSection';
