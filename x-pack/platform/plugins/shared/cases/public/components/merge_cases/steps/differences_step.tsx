/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { useIsMutating } from '@kbn/react-query';
import { MAX_CATEGORY_LENGTH, MAX_TITLE_LENGTH } from '../../../../common/constants';
import type { MergeCasesPreviewResponse } from '../../../../common/types/api';
import { ConnectorTypes } from '../../../../common/types/domain';
import { casesMutationsKeys } from '../../../containers/constants';
import { SeverityHealth, severities } from '../../severity/config';
import type {
  CustomFieldChoice,
  MergeFieldChoices,
  MergeFieldKey,
  MergeSingleFieldKey,
} from '../utils';
import { getConflictKey } from '../utils';
import { getCaseRef } from '../value_cards/case_hover_card';
import {
  CombinedAssigneesField,
  CombinedExtendedField,
  CombinedTagsField,
  countContributingCases,
} from '../value_cards/combined_field';
import { ConflictSection } from '../value_cards/conflict_section';
import { ConnectorRow } from '../value_cards/connector_row';
import { DescriptionRow } from '../value_cards/description_row';
import { CombinedRow, focusFieldRow } from '../value_cards/field_row';
import {
  CustomFieldRow,
  ExtendedFieldRow,
  formatCustomValue,
  formatExtendedValue,
} from '../value_cards/field_rows';
import type { BlockingStateKind, FieldStateKind } from '../value_cards/field_state';
import {
  getChosenOptionIssue,
  getDifferencesSummary,
  getOverLimits,
  isExtendedFieldVisible,
  isTemplateDecided,
} from '../value_cards/field_state';
import { OtherCategoryInput, OtherTextInput } from '../value_cards/other_value_card';
import { SameInEveryCase } from '../value_cards/same_in_every_case';
import { SingleValueRow } from '../value_cards/single_value_row';
import { TemplateRow } from '../value_cards/template_row';
import * as i18n from '../value_cards/translations';

export interface DifferencesStepProps {
  preview: MergeCasesPreviewResponse;
  choices: MergeFieldChoices;
  needsReview: ReadonlySet<MergeFieldKey>;
  /** Why the AI chose a field's value, until the user changes it. */
  aiReasons: ReadonlyMap<MergeFieldKey, string>;
  /** Set when merging into one of the cases. */
  destinationCaseId?: string;
  caseAssignmentAuthorized: boolean;
  isDisabled: boolean;
  /** Scrolled to and focused, such as when Review's "Edit" sends the user back. */
  focusField?: MergeFieldKey;
  onSetField: <K extends MergeSingleFieldKey>(key: K, value: MergeFieldChoices[K]) => void;
  onSetCustomField: (key: string, choice: CustomFieldChoice) => void;
  onSetExtendedField: (key: string, value: string) => void;
  /** Drops the user's value for a field, such as undoing a change to a value every case agrees on. */
  onClearField: (key: MergeFieldKey) => void;
}

interface Row {
  key: MergeFieldKey;
  node: React.ReactNode;
}

/**
 * Step 2: every field the cases disagree on, one choice each, grouped by kind: the template first,
 * because it decides which template fields exist, then the case details, custom fields, the
 * template's fields, what is combined from every case, and what every case agrees on. Nothing is
 * picked for the user; the shortcuts that settle every field at once live in the bar above.
 */
export const DifferencesStep: React.FC<DifferencesStepProps> = ({
  preview,
  choices,
  needsReview,
  aiReasons,
  destinationCaseId,
  caseAssignmentAuthorized,
  isDisabled: isStepDisabled,
  focusField,
  onSetField,
  onSetCustomField,
  onSetExtendedField,
  onClearField,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fields, cases } = preview;
  // The AI request lives in the bar; the fields wait while it runs.
  const isResolving = useIsMutating(casesMutationsKeys.resolveMergeConflicts) > 0;
  const isDisabled = isStepDisabled || isResolving;

  const summary = useMemo(
    () => getDifferencesSummary(preview, choices, needsReview),
    [choices, needsReview, preview]
  );
  const blocking = useMemo(
    () => new Map(summary.blocking.map(({ key, state }) => [key, state])),
    [summary.blocking]
  );
  const conflictKeys = useMemo(
    () => new Set(preview.conflicts.map((conflict) => getConflictKey(conflict))),
    [preview.conflicts]
  );
  const templateDecided = isTemplateDecided(preview, choices);
  const overLimits = getOverLimits(preview, choices);
  const templateName = preview.effectiveTemplate?.name;
  const destination = cases.find(({ id }) => id === destinationCaseId);

  useEffect(() => {
    if (focusField != null) {
      focusFieldRow(focusField);
    }
  }, [focusField]);

  const blockingFor = (key: MergeFieldKey): BlockingStateKind | undefined => blocking.get(key);
  const needsRow = (key: MergeFieldKey, hasConflict: boolean) =>
    hasConflict || conflictKeys.has(key) || blocking.has(key);

  const invalidText = templateName != null ? i18n.STATE_NOT_VALID_FOR(templateName) : undefined;
  const requiredText = (isGlobal: boolean) =>
    templateName != null && !isGlobal ? i18n.STATE_REQUIRED_BY(templateName) : undefined;
  const stateTextFor = (state: BlockingStateKind | undefined, isGlobal = true) =>
    state === 'invalid' ? invalidText : state === 'required' ? requiredText(isGlobal) : undefined;

  const visibleExtended = fields.extendedFields.filter((field) =>
    isExtendedFieldVisible(field, templateDecided)
  );
  const hiddenTemplateFields = fields.extendedFields.length - visibleExtended.length;

  const sameKeys: MergeFieldKey[] = [];
  /** Lists a field no case disagrees on, if the cases hold a value for it. */
  const addSame = (key: MergeFieldKey, value: string | null | undefined) => {
    if (value != null && value.length > 0) {
      sameKeys.push(key);
    }
  };

  const templateRows: Row[] = [];
  const detailRows: Row[] = [];
  const customRows: Row[] = [];
  const templateFieldRows: Row[] = [];
  const combinedRows: Row[] = [];

  // Template
  if (needsRow('template', fields.template.hasConflict)) {
    templateRows.push({
      key: 'template',
      node: (
        <TemplateRow
          key="template"
          preview={preview}
          choice={choices.template}
          onChoose={(template) => onSetField('template', template)}
          state={
            blockingFor('template') ?? (choices.template !== undefined ? 'chosen' : 'chooseOne')
          }
          aiReason={aiReasons.get('template')}
          isDisabled={isDisabled}
        />
      ),
    });
  } else {
    addSame('template', fields.template.value?.name);
  }

  // Title
  if (needsRow('title', fields.title.hasConflict)) {
    detailRows.push({
      key: 'title',
      node: (
        <SingleValueRow<string>
          key="title"
          fieldKey="title"
          label={i18n.TITLE}
          options={fields.title.options}
          chosen={choices.title}
          hasChoice={choices.title !== undefined}
          onChoose={(value) => onSetField('title', value)}
          renderValue={(value) => value}
          toText={(value) => value}
          blockingState={blockingFor('title')}
          aiReason={aiReasons.get('title')}
          layout="list"
          moreLabel={i18n.SHOW_MORE_TITLES}
          other={{
            label: i18n.OTHER_TITLE,
            renderInput: (value) => (
              <OtherTextInput
                fieldLabel={i18n.TITLE}
                value={value ?? ''}
                onChange={(next) => onSetField('title', next)}
                maxLength={MAX_TITLE_LENGTH}
                isDisabled={isDisabled}
              />
            ),
          }}
          cases={cases}
          isDisabled={isDisabled}
        />
      ),
    });
  } else {
    addSame('title', fields.title.value);
  }

  // Description
  if (needsRow('description', fields.description.hasConflict)) {
    detailRows.push({
      key: 'description',
      node: (
        <DescriptionRow
          key="description"
          preview={preview}
          chosen={choices.description}
          onChoose={(value) => onSetField('description', value)}
          blockingState={blockingFor('description')}
          aiReason={aiReasons.get('description')}
          isDisabled={isDisabled}
        />
      ),
    });
  } else {
    addSame('description', fields.description.value);
  }

  // Severity
  if (needsRow('severity', fields.severity.hasConflict)) {
    detailRows.push({
      key: 'severity',
      node: (
        <SingleValueRow
          key="severity"
          fieldKey="severity"
          label={i18n.SEVERITY}
          options={fields.severity.options}
          chosen={choices.severity}
          hasChoice={choices.severity !== undefined}
          onChoose={(value) => onSetField('severity', value)}
          renderValue={(value) => <SeverityHealth severity={value} />}
          toText={(value) => severities[value]?.label ?? value}
          blockingState={blockingFor('severity')}
          aiReason={aiReasons.get('severity')}
          cases={cases}
          isDisabled={isDisabled}
        />
      ),
    });
  } else {
    addSame('severity', severities[fields.severity.value]?.label);
  }

  // Category
  if (needsRow('category', fields.category.hasConflict)) {
    detailRows.push({
      key: 'category',
      node: (
        <SingleValueRow<string | null>
          key="category"
          fieldKey="category"
          label={i18n.CATEGORY}
          options={fields.category.options}
          chosen={choices.category}
          hasChoice={choices.category !== undefined}
          onChoose={(value) => onSetField('category', value)}
          renderValue={(value) => value}
          toText={(value) => value ?? ''}
          blockingState={blockingFor('category')}
          aiReason={aiReasons.get('category')}
          other={{
            label: i18n.OTHER_CATEGORY,
            renderInput: (value) => (
              <OtherCategoryInput
                value={value ?? null}
                onChange={(next) =>
                  onSetField('category', next != null ? next.slice(0, MAX_CATEGORY_LENGTH) : null)
                }
                isDisabled={isDisabled}
              />
            ),
          }}
          cases={cases}
          isDisabled={isDisabled}
        />
      ),
    });
  } else {
    addSame('category', fields.category.value);
  }

  // Connector
  if (needsRow('connector', fields.connector.hasConflict)) {
    detailRows.push({
      key: 'connector',
      node: (
        <ConnectorRow
          key="connector"
          preview={preview}
          choice={choices.connector}
          onChoose={(connector) => onSetField('connector', connector)}
          state={
            blockingFor('connector') ?? (choices.connector !== undefined ? 'chosen' : 'chooseOne')
          }
          aiReason={aiReasons.get('connector')}
          isDisabled={isDisabled}
        />
      ),
    });
  } else if (fields.connector.value.type !== ConnectorTypes.none) {
    addSame('connector', fields.connector.value.name);
  }

  // Legacy custom fields
  for (const field of fields.customFields) {
    const key: MergeFieldKey = `customFields.${field.key}`;
    if (needsRow(key, field.hasConflict)) {
      customRows.push({
        key,
        node: (
          <CustomFieldRow
            key={key}
            field={field}
            choice={choices.customFields?.[field.key]}
            onChoose={(choice) => onSetCustomField(field.key, choice)}
            blockingState={blockingFor(key)}
            aiReason={aiReasons.get(key)}
            cases={cases}
            isDisabled={isDisabled}
          />
        ),
      });
    } else if (field.options.length > 0) {
      addSame(key, formatCustomValue(field.type, field.value));
    }
  }

  // Tags
  const tags = choices.tags ?? fields.tags.value;
  const tagsState: FieldStateKind = blockingFor('tags') ?? 'combined';
  // Tags every case agrees on stay with the other agreed values, even once the user edits them.
  if (fields.tags.provenance === 'combined' || fields.tags.overBy > 0 || overLimits.tags > 0) {
    combinedRows.push({
      key: 'tags',
      node: (
        <CombinedRow
          key="tags"
          fieldKey="tags"
          label={i18n.TAGS}
          state={tagsState}
          stateText={
            tagsState === 'overLimit'
              ? i18n.STATE_REMOVE(overLimits.tags)
              : i18n.STATE_COMBINED(countContributingCases(fields.tags.items))
          }
        >
          <CombinedTagsField
            tags={tags}
            field={fields.tags}
            onChange={(next) => onSetField('tags', next)}
            isDisabled={isDisabled}
          />
        </CombinedRow>
      ),
    });
  } else {
    addSame('tags', fields.tags.value.join(', '));
  }

  // Assignees
  const assigneesLocked = !fields.assignees.canChange || !caseAssignmentAuthorized;
  const assignees = choices.assignees ?? fields.assignees.value;
  if (
    fields.assignees.provenance === 'combined' ||
    choices.assignees !== undefined ||
    overLimits.assignees > 0 ||
    (assigneesLocked && fields.assignees.items.length > 0)
  ) {
    const assigneesState: FieldStateKind = assigneesLocked
      ? 'locked'
      : blockingFor('assignees') ?? 'combined';
    combinedRows.push({
      key: 'assignees',
      node: (
        <CombinedRow
          key="assignees"
          fieldKey="assignees"
          label={i18n.ASSIGNEES}
          state={assigneesState}
          stateText={
            assigneesState === 'overLimit'
              ? i18n.STATE_REMOVE(overLimits.assignees)
              : assigneesState === 'combined'
              ? i18n.STATE_COMBINED(countContributingCases(fields.assignees.items))
              : undefined
          }
        >
          <CombinedAssigneesField
            assignees={assignees}
            field={
              assigneesLocked && fields.assignees.canChange
                ? { ...fields.assignees, canChange: false, unavailableReason: 'privilege' }
                : fields.assignees
            }
            onChange={(next) => onSetField('assignees', next)}
            destinationRef={destination != null ? getCaseRef(destination) : undefined}
            isDisabled={isDisabled}
          />
        </CombinedRow>
      ),
    });
  }

  // Template and global fields: global single-value ones sit with the custom fields.
  for (const field of visibleExtended) {
    const key: MergeFieldKey = `extendedFields.${field.key}`;
    const state = blockingFor(key);
    if (field.multiValue) {
      if ((field.items?.length ?? 0) > 0 || (field.notCopiedValues?.length ?? 0) > 0 || state) {
        combinedRows.push({
          key,
          node: (
            <CombinedRow
              key={key}
              fieldKey={key}
              label={field.label}
              state={state ?? 'combined'}
              stateText={
                state != null
                  ? stateTextFor(state, field.isGlobal)
                  : i18n.STATE_COMBINED(countContributingCases(field.items ?? []))
              }
            >
              <CombinedExtendedField
                field={field}
                value={choices.extendedFields?.[field.key] ?? field.value}
                onChange={(value) => onSetExtendedField(field.key, value)}
                templateName={templateName}
                isDisabled={isDisabled}
              />
            </CombinedRow>
          ),
        });
      }
    } else {
      const chosenIssue = getChosenOptionIssue(preview, choices, key);
      if (needsRow(key, field.hasConflict) || chosenIssue != null) {
        (field.isGlobal ? customRows : templateFieldRows).push({
          key,
          node: (
            <ExtendedFieldRow
              key={key}
              field={field}
              choice={choices.extendedFields?.[field.key]}
              onChoose={(value) => onSetExtendedField(field.key, value)}
              blockingState={state}
              stateText={stateTextFor(state, field.isGlobal)}
              aiReason={aiReasons.get(key)}
              cases={cases}
              isDisabled={isDisabled}
            />
          ),
        });
      } else if (field.options.length > 0 || field.provenance === 'templateDefault') {
        addSame(key, formatExtendedValue(field, field.value));
      }
    }
  }

  /** "4 fields · 1 left", in the warning colour while a field still needs the user. */
  const countSummary = (rows: Row[]) => {
    const open = rows.filter(({ key }) => blocking.has(key)).length;
    return {
      summary:
        open > 0
          ? `${i18n.SECTION_FIELDS(rows.length)} · ${i18n.SECTION_LEFT(open)}`
          : i18n.SECTION_FIELDS(rows.length),
      needsAttention: open > 0,
    };
  };

  const showTemplateFieldsHidden = !templateDecided && hiddenTemplateFields > 0;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.base};
      `}
      data-test-subj="merge-differences-step"
    >
      {summary.total === 0 ? (
        <EuiText size="s" data-test-subj="merge-differences-intro">
          {i18n.NO_DIFFERENCES}
        </EuiText>
      ) : null}
      {templateRows.length > 0 ? (
        <ConflictSection
          title={i18n.SECTION_TEMPLATE}
          summary={i18n.SECTION_TEMPLATE_HELP}
          data-test-subj="merge-conflict-section-template"
        >
          {templateRows.map(({ node }) => node)}
          {showTemplateFieldsHidden ? (
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                padding: ${euiTheme.size.s} ${euiTheme.size.base};
              `}
              data-test-subj="merge-template-fields-hidden"
            >
              {i18n.TEMPLATE_FIELDS_HIDDEN}
            </EuiText>
          ) : null}
        </ConflictSection>
      ) : null}
      {detailRows.length > 0 ? (
        <ConflictSection
          title={i18n.SECTION_DETAILS}
          {...countSummary(detailRows)}
          data-test-subj="merge-conflict-section-details"
        >
          {detailRows.map(({ node }) => node)}
        </ConflictSection>
      ) : null}
      {customRows.length > 0 ? (
        <ConflictSection
          title={i18n.SECTION_CUSTOM_FIELDS}
          {...countSummary(customRows)}
          data-test-subj="merge-conflict-section-custom"
        >
          {customRows.map(({ node }) => node)}
        </ConflictSection>
      ) : null}
      {templateFieldRows.length > 0 ? (
        <ConflictSection
          title={
            templateName != null
              ? i18n.SECTION_TEMPLATE_FIELDS(templateName)
              : i18n.SECTION_TEMPLATE_FIELDS_DEFAULT
          }
          {...countSummary(templateFieldRows)}
          data-test-subj="merge-conflict-section-template-fields"
        >
          {templateFieldRows.map(({ node }) => node)}
        </ConflictSection>
      ) : null}
      {combinedRows.length > 0 ? (
        <ConflictSection
          title={i18n.SECTION_COMBINED}
          summary={i18n.SECTION_COMBINED_HELP}
          needsAttention={combinedRows.some(({ key }) => blocking.has(key))}
          data-test-subj="merge-conflict-section-combined"
        >
          {combinedRows.map(({ node }) => node)}
        </ConflictSection>
      ) : null}
      <SameInEveryCase
        preview={preview}
        choices={choices}
        fieldKeys={sameKeys}
        isDisabled={isDisabled}
        onSetField={onSetField}
        onSetCustomField={onSetCustomField}
        onSetExtendedField={onSetExtendedField}
        onClearField={onClearField}
      />
    </div>
  );
};
DifferencesStep.displayName = 'DifferencesStep';
