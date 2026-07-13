/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { ParsedTemplateDefinition } from '../../../../common/types/domain/template/v1';
import type { CaseAssignees } from '../../../../common/types/domain_zod/user/v1';
import type { CaseSeverity } from '../../../../common/types/domain';
import { severities } from '../../severity/config';
import { SEVERITY_TITLE } from '../../severity/translations';
import * as commonI18n from '../../../common/translations';
import { useIsUserTyping } from '../../../common/use_is_user_typing';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useAvailableCasesOwners } from '../../app/use_available_owners';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { getAllPermissionsExceptFrom } from '../../../utils/permissions';
import { useGetTemplateTags } from '../hooks/use_get_template_tags';
import { useGetCategories } from '../../../containers/use_get_categories';
import { CategoryComponent } from '../../category/category_component';
import type { OnCaseDefaultChange } from '../case_default_fields';
import { DebouncedTemplateTextField } from './debounced_template_text_field';
import * as i18n from '../translations';

interface TemplateCaseDefaultsFormProps {
  parsedTemplate: ParsedTemplateDefinition;
  onChange?: OnCaseDefaultChange;
}

const severityOptions = [
  ...(Object.keys(severities) as CaseSeverity[]).map((severity) => ({
    value: severity,
    text: severities[severity].label,
  })),
];

/**
 * Holds an input's value locally so typing is smooth, while staying in sync with the parsed
 * definition. The parsed definition only reflects edits after the debounced YAML round-trip, so a
 * plain controlled input would revert each keystroke. Local state updates immediately on change and
 * re-syncs whenever the (value-compared) external value changes — e.g. a direct YAML edit or a
 * template load.
 */
const useSyncedState = <T,>(external: T): [T, (next: T) => void] => {
  const [value, setValue] = useState<T>(external);
  const lastExternalRef = useRef<T>(external);

  useEffect(() => {
    if (!isEqual(lastExternalRef.current, external)) {
      lastExternalRef.current = external;
      setValue(external);
    }
  }, [external]);

  return [value, setValue];
};

export const TemplateCaseDefaultsForm: React.FC<TemplateCaseDefaultsFormProps> = ({
  parsedTemplate,
  onChange,
}) => {
  const { owner: owners } = useCasesContext();
  const availableOwners = useAvailableCasesOwners(getAllPermissionsExceptFrom('delete'));
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  const {
    data: suggestedProfiles = [],
    isLoading,
    isFetching,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owners.length > 0 ? owners : availableOwners,
    onDebounce,
  });

  const { data: availableCategories = [], isLoading: isLoadingCategories } = useGetCategories();

  // Free-text title/description each own their local value via DebouncedTemplateTextField, so typing
  // in one never re-renders the async comboboxes below. Select/combobox fields change atomically, so
  // they hold local state and propagate immediately.
  const handleNameChange = useCallback((value: string) => onChange?.('name', value), [onChange]);
  const handleDescriptionChange = useCallback(
    (value: string) => onChange?.('description', value),
    [onChange]
  );
  const [severity, setSeverity] = useSyncedState<string>(parsedTemplate.severity ?? '');
  const [category, setCategory] = useSyncedState<string | null>(parsedTemplate.category ?? null);
  const [tags, setTags] = useSyncedState<string[]>(parsedTemplate.tags ?? []);
  const [selectedAssignees, setSelectedAssignees] = useSyncedState<CaseAssignees>(
    parsedTemplate.assignees ?? []
  );

  const handleSeverityChange = useCallback(
    (value: string) => {
      setSeverity(value);
      onChange?.('severity', value);
    },
    [onChange, setSeverity]
  );

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      setCategory(value ?? null);
      // Empty selection clears the default; updateYamlCaseDefault stores an empty value as null.
      onChange?.('category', value ?? '');
    },
    [onChange, setCategory]
  );
  const missingAssigneeUids = useMemo(
    () =>
      selectedAssignees
        .map(({ uid }) => uid)
        .filter((uid) => !suggestedProfiles.some((profile) => profile.uid === uid)),
    [selectedAssignees, suggestedProfiles]
  );
  const { data: bulkUserProfiles = new Map(), isFetching: isLoadingBulkGetUserProfiles } =
    useBulkGetUserProfiles({
      uids: missingAssigneeUids,
    });
  const { data: knownTags = [] } = useGetTemplateTags();
  const assigneeProfiles = useMemo(
    () => [...suggestedProfiles, ...Array.from(bulkUserProfiles.values())],
    [suggestedProfiles, bulkUserProfiles]
  );
  const assigneeOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      Array.from(
        assigneeProfiles
          .reduce<Map<string, EuiComboBoxOptionOption<string>>>((acc, profile) => {
            acc.set(profile.uid, {
              label: getUserDisplayName(profile.user),
              value: profile.uid,
              key: profile.uid,
            });
            return acc;
          }, new Map())
          .values()
      ),
    [assigneeProfiles]
  );
  const selectedAssigneeOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      selectedAssignees.map(({ uid }) => {
        const option = assigneeOptions.find((candidate) => candidate.value === uid);
        return option ?? { label: uid, value: uid, key: uid };
      }),
    [selectedAssignees, assigneeOptions]
  );

  const availableTagOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => knownTags.map((tag) => ({ label: tag, value: tag })),
    [knownTags]
  );

  const selectedTagOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => tags.map((tag) => ({ label: tag, value: tag })),
    [tags]
  );

  const handleTagsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      const nextTags = options.map((option) => option.label);
      setTags(nextTags);
      onChange?.('tags', nextTags);
    },
    [onChange, setTags]
  );

  const handleCreateTag = useCallback(
    (searchValue: string) => {
      const trimmed = searchValue.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (tags.some((tag) => tag === trimmed)) {
        return;
      }
      const nextTags = [...tags, trimmed];
      setTags(nextTags);
      onChange?.('tags', nextTags);
    },
    [tags, onChange, setTags]
  );
  const handleAssigneesChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      // Every option carries the profile uid in `value`; never fall back to `label` (a display
      // name) which would persist an unusable assignee id.
      const nextAssignees = options
        .map((option) => option.value)
        .filter((uid): uid is string => uid != null)
        .map((uid) => ({ uid }));
      setSelectedAssignees(nextAssignees);
      onChange?.('assignees', nextAssignees);
    },
    [onChange, setSelectedAssignees]
  );

  const handleAssigneesSearch = useCallback(
    (value: string) => {
      if (!isEmpty(value)) {
        setSearchTerm(value);
      }
      onContentChange(value);
    },
    [onContentChange]
  );

  return (
    <EuiForm component="div" data-test-subj="templateCaseDefaultsForm">
      <DebouncedTemplateTextField
        label={i18n.CASE_DEFAULT_TITLE}
        value={parsedTemplate.name ?? ''}
        onChange={handleNameChange}
        dataTestSubj="caseDefaultsTitleInput"
      />

      <DebouncedTemplateTextField
        multiline
        label={commonI18n.DESCRIPTION}
        value={parsedTemplate.description ?? ''}
        onChange={handleDescriptionChange}
        dataTestSubj="caseDefaultsDescriptionInput"
      />

      <EuiFormRow label={SEVERITY_TITLE} fullWidth>
        <EuiSelect
          options={severityOptions}
          value={severity}
          onChange={(event) => handleSeverityChange(event.target.value)}
          fullWidth
          data-test-subj="caseDefaultsSeverityInput"
        />
      </EuiFormRow>

      <EuiFormRow label={commonI18n.CATEGORY} fullWidth>
        <CategoryComponent
          isLoading={isLoadingCategories}
          availableCategories={availableCategories}
          category={category}
          onChange={handleCategoryChange}
        />
      </EuiFormRow>

      <EuiFormRow label={commonI18n.TAGS} fullWidth>
        <EuiComboBox
          fullWidth
          options={availableTagOptions}
          selectedOptions={selectedTagOptions}
          onChange={handleTagsChange}
          onCreateOption={handleCreateTag}
          data-test-subj="caseDefaultsTagsInput"
        />
      </EuiFormRow>

      <EuiFormRow label={i18n.CASE_DEFAULT_ASSIGNEES} fullWidth>
        <EuiComboBox
          fullWidth
          async
          isLoading={isLoading || isFetching || isLoadingBulkGetUserProfiles || isUserTyping}
          options={assigneeOptions}
          selectedOptions={selectedAssigneeOptions}
          onChange={handleAssigneesChange}
          onSearchChange={handleAssigneesSearch}
          data-test-subj="caseDefaultsAssigneesInput"
        />
      </EuiFormRow>
    </EuiForm>
  );
};

TemplateCaseDefaultsForm.displayName = 'TemplateCaseDefaultsForm';
