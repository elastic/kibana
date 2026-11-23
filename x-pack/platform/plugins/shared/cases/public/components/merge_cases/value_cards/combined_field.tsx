/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCheckboxGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { MAX_LENGTH_PER_TAG } from '../../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeExtendedFieldPreview,
} from '../../../../common/types/api';
import type { CaseAssignees } from '../../../../common/types/domain';
import { useGetTags } from '../../../containers/use_get_tags';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { validateEmptyTags, validateMaxLength } from '../../case_form_fields/utils';
import type { SelectedUser } from '../../templates_v2/field_types/controls/user_picker/utils';
import { toSelectedUsers } from '../../templates_v2/field_types/controls/user_picker/utils';
import { getName } from '../../user_profiles/display_name';
import * as i18n from './translations';

type Items<T> = Array<{ value: T; caseIds: string[] }>;

/** "brute-force (2)": the value, and how many cases held it when more than one did. */
const withCount = (label: string, count: number | undefined) =>
  count != null && count > 1 ? `${label} (${count})` : label;

/** The number of cases that contributed values to a combined field. */
export const countContributingCases = (items: Items<unknown>): number =>
  new Set(items.flatMap(({ caseIds }) => caseIds)).size;

interface TagsProps {
  tags: string[];
  field: MergeCasesPreviewResponse['fields']['tags'];
  onChange: (tags: string[]) => void;
  isDisabled?: boolean;
}

/** Every case's tags as removable pills, in the combo box the case page uses. */
export const CombinedTagsField: React.FC<TagsProps> = ({
  tags,
  field,
  onChange,
  isDisabled = false,
}) => {
  const { data: suggestions = [] } = useGetTags();
  const [error, setError] = useState<string | undefined>();
  const counts = useMemo(
    () => new Map(field.items.map(({ value, caseIds }) => [value, caseIds.length])),
    [field.items]
  );
  const over = tags.length - field.max;
  const singleCaseTags = field.items.filter(
    ({ value, caseIds }) => caseIds.length === 1 && tags.includes(value)
  );

  const toOption = (tag: string): EuiComboBoxOptionOption<string> => ({
    label: withCount(tag, counts.get(tag)),
    value: tag,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {over > 0 ? (
        <EuiText size="xs" color="warning" data-test-subj="merge-tags-over-limit">
          {i18n.TAGS_OVER_LIMIT(tags.length, field.max, over)}
        </EuiText>
      ) : null}
      <EuiComboBox
        fullWidth
        compressed
        placeholder={i18n.ADD_TAGS}
        aria-label={i18n.TAGS}
        options={suggestions.filter((tag) => !tags.includes(tag)).map(toOption)}
        selectedOptions={tags.map(toOption)}
        isDisabled={isDisabled}
        isInvalid={error != null}
        onChange={(selected) => {
          setError(undefined);
          onChange(selected.flatMap(({ value }) => (value != null ? [value] : [])));
        }}
        onCreateOption={(searchValue) => {
          const tag = searchValue.trim();
          const invalid =
            validateEmptyTags({ value: tag, message: i18n.TAG_EMPTY }) ??
            validateMaxLength({
              value: tag,
              message: i18n.TAG_TOO_LONG(MAX_LENGTH_PER_TAG),
              limit: MAX_LENGTH_PER_TAG,
            });
          if (invalid != null) {
            setError(invalid.message);
            return false;
          }
          if (!tags.includes(tag)) {
            onChange([...tags, tag]);
          }
        }}
        data-test-subj="merge-tags-input"
      />
      {error != null ? (
        <EuiText size="xs" color="danger">
          {error}
        </EuiText>
      ) : null}
      {over > 0 && singleCaseTags.length > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={() => {
              const remove = new Set(singleCaseTags.map(({ value }) => value));
              onChange(tags.filter((tag) => !remove.has(tag)));
            }}
            data-test-subj="merge-tags-remove-single-case"
          >
            {i18n.REMOVE_SINGLE_CASE_TAGS(singleCaseTags.length)}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
CombinedTagsField.displayName = 'CombinedTagsField';

interface UsersComboProps {
  label: string;
  placeholder: string;
  users: SelectedUser[];
  counts?: Map<string, number>;
  onChange: (users: SelectedUser[]) => void;
  isDisabled?: boolean;
  'data-test-subj': string;
}

/** People as removable pills; typing searches the users who can access Cases. */
const UsersCombo: React.FC<UsersComboProps> = ({
  label,
  placeholder,
  users,
  counts,
  onChange,
  isDisabled = false,
  'data-test-subj': dataTestSubj,
}) => {
  const { owner } = useCasesContext();
  const [search, setSearch] = useState('');
  const { data: profiles = [], isFetching } = useSuggestUserProfiles({
    name: search,
    owners: owner,
  });
  const selectedUids = new Set(users.map(({ uid }) => uid));
  const options = profiles
    .filter(({ uid }) => !selectedUids.has(uid))
    .map((profile) => ({ label: getUserDisplayName(profile.user), value: profile.uid }));

  return (
    <EuiComboBox
      fullWidth
      compressed
      async
      isLoading={isFetching}
      placeholder={placeholder}
      aria-label={label}
      options={options}
      selectedOptions={users.map(({ uid, name }) => ({
        label: withCount(name, counts?.get(uid)),
        value: uid,
      }))}
      onSearchChange={setSearch}
      isDisabled={isDisabled}
      onChange={(selected) => {
        const names = new Map(users.map(({ uid, name }) => [uid, name]));
        onChange(
          selected.flatMap(({ value, label: optionLabel }) =>
            value != null ? [{ uid: value, name: names.get(value) ?? optionLabel }] : []
          )
        );
      }}
      data-test-subj={dataTestSubj}
    />
  );
};
UsersCombo.displayName = 'UsersCombo';

interface AssigneesProps {
  assignees: CaseAssignees;
  field: MergeCasesPreviewResponse['fields']['assignees'];
  onChange: (assignees: CaseAssignees) => void;
  /** Set when merging into one of the cases. */
  destinationRef?: string;
  isDisabled?: boolean;
}

/** Every case's assignees, each once. Without the privilege or license, they can't change. */
export const CombinedAssigneesField: React.FC<AssigneesProps> = ({
  assignees,
  field,
  onChange,
  destinationRef,
  isDisabled = false,
}) => {
  const { data: profiles } = useBulkGetUserProfiles({ uids: assignees.map(({ uid }) => uid) });
  const users = assignees.map(({ uid }) => ({ uid, name: getName(profiles?.get(uid)?.user) }));
  const counts = useMemo(
    () => new Map(field.items.map(({ value, caseIds }) => [value.uid, caseIds.length])),
    [field.items]
  );

  if (!field.canChange) {
    return (
      <EuiText size="s" data-test-subj="merge-assignees-locked">
        <p>
          {destinationRef != null
            ? i18n.ASSIGNEES_LOCKED_EXISTING(destinationRef)
            : i18n.ASSIGNEES_LOCKED_NEW_CASE}{' '}
          {destinationRef != null && users.length > 0
            ? users.map(({ name }) => name).join(', ')
            : null}
        </p>
        <EuiText size="xs" color="subdued">
          {field.unavailableReason === 'license'
            ? i18n.ASSIGNEES_LOCKED_LICENSE
            : i18n.ASSIGNEES_LOCKED_PRIVILEGE}
        </EuiText>
      </EuiText>
    );
  }

  const over = assignees.length - field.max;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {over > 0 ? (
        <EuiText size="xs" color="warning" data-test-subj="merge-assignees-over-limit">
          {i18n.ASSIGNEES_OVER_LIMIT(assignees.length, field.max, over)}
        </EuiText>
      ) : null}
      <UsersCombo
        label={i18n.ASSIGNEES}
        placeholder={i18n.ADD_ASSIGNEES}
        users={users}
        counts={counts}
        isDisabled={isDisabled}
        onChange={(next) => onChange(next.map(({ uid }) => ({ uid })))}
        data-test-subj="merge-assignees-input"
      />
    </EuiFlexGroup>
  );
};
CombinedAssigneesField.displayName = 'CombinedAssigneesField';

interface MultiExtendedProps {
  field: MergeExtendedFieldPreview;
  /** The stored JSON array the merged case gets. */
  value: string;
  onChange: (value: string) => void;
  templateName?: string;
  isDisabled?: boolean;
}

const parseStringArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value.length > 0 ? [value] : [];
  }
};

/**
 * A multi-value template field: a checkbox group limited to the template's options, or several
 * people. Values the template doesn't allow are named and stay on their cases.
 */
export const CombinedExtendedField: React.FC<MultiExtendedProps> = ({
  field,
  value,
  onChange,
  templateName,
  isDisabled = false,
}) => {
  const notCopied = field.notCopiedValues ?? [];
  const notCopiedNote =
    notCopied.length > 0 ? (
      <EuiText size="xs" color="subdued" data-test-subj="merge-multi-not-copied">
        {i18n.NOT_COPIED_VALUES(
          notCopied.map((item) => `"${item.value}"`).join(', '),
          templateName ?? i18n.TEMPLATE
        )}
      </EuiText>
    ) : null;

  if (field.control === 'USER_PICKER') {
    const counts = new Map(
      (field.items ?? []).flatMap(({ value: itemValue, caseIds }) =>
        toSelectedUsers(toArray(safeParse(itemValue))).map(
          ({ uid }) => [uid, caseIds.length] as const
        )
      )
    );
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <UsersCombo
          label={field.label}
          placeholder={i18n.ADD_PEOPLE}
          users={toSelectedUsers(value)}
          counts={counts}
          isDisabled={isDisabled}
          onChange={(users) => onChange(JSON.stringify(users))}
          data-test-subj={`merge-multi-users-${field.key}`}
        />
        {notCopiedNote}
      </EuiFlexGroup>
    );
  }

  const allowed = field.definition.options ?? [];
  const selected = new Set(parseStringArray(value));
  const counts = new Map((field.items ?? []).map(({ value: item, caseIds }) => [item, caseIds]));
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiCheckboxGroup
        compressed
        legend={{ children: field.label, display: 'hidden' }}
        options={allowed.map((option) => ({
          id: `${field.key}-${option}`,
          label: withCount(option, counts.get(option)?.length),
          'data-test-subj': `merge-multi-option-${option}`,
        }))}
        idToSelectedMap={Object.fromEntries(
          allowed.map((option) => [`${field.key}-${option}`, selected.has(option)])
        )}
        disabled={isDisabled}
        onChange={(id) => {
          const option = allowed.find((candidate) => `${field.key}-${candidate}` === id);
          if (option == null) {
            return;
          }
          const next = new Set(selected);
          if (next.has(option)) {
            next.delete(option);
          } else {
            next.add(option);
          }
          onChange(JSON.stringify(allowed.filter((candidate) => next.has(candidate))));
        }}
        css={css`
          display: flex;
          flex-wrap: wrap;
          gap: 4px 16px;
        `}
        data-test-subj={`merge-multi-checkboxes-${field.key}`}
      />
      {notCopiedNote}
    </EuiFlexGroup>
  );
};
CombinedExtendedField.displayName = 'CombinedExtendedField';

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

const safeParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
