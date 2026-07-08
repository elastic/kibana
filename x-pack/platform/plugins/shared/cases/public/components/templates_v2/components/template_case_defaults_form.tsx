/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';
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
import * as i18n from '../translations';

type EditableCaseDefaultField =
  | 'name'
  | 'description'
  | 'severity'
  | 'category'
  | 'tags'
  | 'assignees';

interface TemplateCaseDefaultsFormProps {
  parsedTemplate: ParsedTemplateDefinition;
  onChange?: (field: EditableCaseDefaultField, value: string | string[] | CaseAssignees) => void;
}

const severityOptions = [
  ...(Object.keys(severities) as CaseSeverity[]).map((severity) => ({
    value: severity,
    text: severities[severity].label,
  })),
];

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
  const selectedAssignees = useMemo(
    () => parsedTemplate.assignees ?? [],
    [parsedTemplate.assignees]
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
    () => (parsedTemplate.tags ?? []).map((tag) => ({ label: tag, value: tag })),
    [parsedTemplate.tags]
  );

  const handleTagsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      onChange?.(
        'tags',
        options.map((option) => option.label)
      );
    },
    [onChange]
  );

  const handleCreateTag = useCallback(
    (searchValue: string) => {
      const trimmed = searchValue.trim();
      if (trimmed.length === 0) {
        return;
      }
      if ((parsedTemplate.tags ?? []).some((tag) => tag === trimmed)) {
        return;
      }
      onChange?.('tags', [...(parsedTemplate.tags ?? []), trimmed]);
    },
    [parsedTemplate.tags, onChange]
  );
  const handleAssigneesChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      onChange?.(
        'assignees',
        options.map((option) => ({ uid: option.value ?? option.label }))
      );
    },
    [onChange]
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
      <EuiFormRow label={i18n.CASE_DEFAULT_TITLE} fullWidth>
        <EuiFieldText
          value={parsedTemplate.name ?? ''}
          onChange={(event) => onChange?.('name', event.target.value)}
          fullWidth
          data-test-subj="caseDefaultsTitleInput"
        />
      </EuiFormRow>

      <EuiFormRow label={commonI18n.DESCRIPTION} fullWidth>
        <EuiFieldText
          value={parsedTemplate.description ?? ''}
          onChange={(event) => onChange?.('description', event.target.value)}
          fullWidth
          data-test-subj="caseDefaultsDescriptionInput"
        />
      </EuiFormRow>

      <EuiFormRow label={SEVERITY_TITLE} fullWidth>
        <EuiSelect
          options={severityOptions}
          value={parsedTemplate.severity ?? ''}
          onChange={(event) => onChange?.('severity', event.target.value)}
          fullWidth
          data-test-subj="caseDefaultsSeverityInput"
        />
      </EuiFormRow>

      <EuiFormRow label={commonI18n.CATEGORY} fullWidth>
        <EuiFieldText
          value={parsedTemplate.category ?? ''}
          onChange={(event) => onChange?.('category', event.target.value)}
          fullWidth
          data-test-subj="caseDefaultsCategoryInput"
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
