/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useController, useForm } from 'react-hook-form';

import type {
  BoostProfile,
  BoostProfileType,
  BoostRule,
  BoostRuleListItem,
  BoostRuleMatch,
} from '../../../common/types';
import { validateIndexPattern, validateName } from '../../../common/validation';
import { CANCEL_BUTTON_LABEL, SAVE_CHANGES_BUTTON_LABEL } from '../../translations';
import { AppliesToFooter } from '../applies_to_footer/applies_to_footer';
import { IndexPatternField } from './index_pattern_field';
import { parsePriority } from './priority';
import { getProfileOptions, getSelectedProfileOptions } from './profile_options';
import { findTiedRule } from './rule_ties';
import { TargetList } from './target_list';
import { matchTargets } from './target_matches';
import {
  CREATE_PROFILE_LINK,
  CREATE_RULE_BUTTON_LABEL,
  CREATE_TITLE,
  DESCRIPTION,
  INDEX_PATTERN_LABEL,
  LOCKED_PROFILE_HELP_TEXTS,
  NAME_HELP_TEXT,
  NAME_LABEL,
  NAME_TAKEN_ERROR,
  PRIORITY_LABEL,
  PROFILE_HELP_TEXT,
  PROFILE_LABEL,
  PROFILE_NO_MATCH,
  PROFILE_REQUIRED_ERROR,
  SELECT_PROFILE_FIRST_TOOLTIP,
  getEditTitle,
  getIndexPatternPlaceholder,
  getPriorityTieError,
} from './translations';

export type BoostRuleInput = Pick<
  BoostRule,
  'name' | 'index_pattern' | 'boost_profile' | 'priority'
>;

export interface RuleFlyoutProps {
  /** The rule to edit. Without one, the flyout creates a rule. */
  rule?: BoostRule;
  profiles: readonly BoostProfile[];
  /** Every existing rule, to catch a duplicate name or a priority tie. */
  rules: readonly BoostRuleListItem[];
  /** The indices and data streams a rule can target, per type. */
  targets: Readonly<Record<BoostProfileType, readonly BoostRuleMatch[]>>;
  isSaving?: boolean;
  /**
   * Opens the profile flyout, with the type fixed when given. Resolves with the name of the profile
   * it creates, which then gets selected.
   */
  onCreateProfile: (type?: BoostProfileType) => Promise<string | undefined>;
  onSave: (rule: BoostRuleInput) => void;
  onClose: () => void;
}

interface RuleFormValues {
  name: string;
  profileName: string;
  indexPattern: string;
  /** As typed, so the field can be empty while the user edits it. */
  priority: string;
}

const NON_DIGITS = /\D/g;

const getPriorityStyles = ({ base }: EuiThemeComputed) => css`
  width: ${base * 9}px;
`;

export const RuleFlyout = ({
  rule,
  profiles,
  rules,
  targets,
  isSaving = false,
  onCreateProfile,
  onSave,
  onClose,
}: RuleFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostRuleFlyoutTitle' });
  const lockedType = rule
    ? profiles.find(({ name }) => name === rule.boost_profile)?.type
    : undefined;
  const getProfileType = (profileName: string) =>
    profiles.find(({ name }) => name === profileName)?.type;

  const { control, handleSubmit } = useForm<RuleFormValues>({
    defaultValues: {
      name: rule?.name ?? '',
      profileName: rule?.boost_profile ?? '',
      indexPattern: rule?.index_pattern ?? '',
      priority: String(rule?.priority ?? 0),
    },
  });

  const { field: nameField, fieldState: nameState } = useController({
    control,
    name: 'name',
    rules: {
      validate: (name) => {
        if (rule) {
          return true;
        }
        const error = validateName(name);
        if (error) {
          return error.message;
        }
        return rules.some((existing) => existing.name === name) ? NAME_TAKEN_ERROR : true;
      },
    },
  });

  const { field: profileField, fieldState: profileState } = useController({
    control,
    name: 'profileName',
    rules: {
      validate: (profileName) => (profileName ? true : PROFILE_REQUIRED_ERROR),
      deps: ['priority'],
    },
  });

  const { field: indexPatternField, fieldState: indexPatternState } = useController({
    control,
    name: 'indexPattern',
    rules: {
      validate: (indexPattern) => validateIndexPattern(indexPattern)?.message ?? true,
      deps: ['priority'],
    },
  });

  const { field: priorityField, fieldState: priorityState } = useController({
    control,
    name: 'priority',
    rules: {
      validate: (priority, { name, profileName, indexPattern }) => {
        const type = getProfileType(profileName);
        if (!type || validateIndexPattern(indexPattern)) {
          return true;
        }
        const tiedRule = findTiedRule(
          {
            name: rule?.name ?? name,
            index_pattern: indexPattern,
            priority: parsePriority(priority),
            type,
          },
          rules
        );
        return tiedRule ? getPriorityTieError(tiedRule.name) : true;
      },
    },
  });

  const selectedProfile = profiles.find(({ name }) => name === profileField.value);
  const type = selectedProfile?.type;
  const profileOptions = useMemo(
    () => getProfileOptions(profiles, lockedType),
    [profiles, lockedType]
  );

  const matchedTargets = useMemo(
    () => (type ? matchTargets(indexPatternField.value, targets[type]) : []),
    [type, indexPatternField.value, targets]
  );
  const exactMatches = matchedTargets.filter(({ match }) => match === 'exact');
  const appliedMatches = exactMatches.filter(({ outrankedByRuleName }) => !outrankedByRuleName);
  const appliedSizeInBytes = appliedMatches.reduce(
    (total, { storageSizeInBytes = 0 }) => total + storageSizeInBytes,
    0
  );

  const createProfile = async () => {
    const createdProfileName = await onCreateProfile(lockedType);
    if (createdProfileName) {
      profileField.onChange(createdProfileName);
    }
  };

  const save = ({ name, profileName, indexPattern, priority }: RuleFormValues) =>
    onSave({
      name: rule?.name ?? name,
      boost_profile: profileName,
      index_pattern: indexPattern,
      priority: parsePriority(priority),
    });

  return (
    <EuiFlyout
      size="m"
      aria-labelledby={titleId}
      onClose={onClose}
      data-test-subj="searchBoostRuleFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{rule ? getEditTitle(rule.name) : CREATE_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>{DESCRIPTION}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {rule ? null : (
          <EuiFormRow
            fullWidth
            label={NAME_LABEL}
            helpText={NAME_HELP_TEXT}
            isInvalid={Boolean(nameState.error)}
            error={nameState.error?.message}
          >
            <EuiFieldText
              fullWidth
              value={nameField.value}
              isInvalid={Boolean(nameState.error)}
              disabled={isSaving}
              inputRef={nameField.ref}
              onChange={(event) => nameField.onChange(event.target.value)}
              onBlur={nameField.onBlur}
              data-test-subj="searchBoostRuleFlyoutName"
            />
          </EuiFormRow>
        )}
        <EuiFormRow
          fullWidth
          label={PROFILE_LABEL}
          labelAppend={
            <EuiText size="xs">
              <EuiLink
                disabled={isSaving}
                onClick={createProfile}
                data-test-subj="searchBoostRuleFlyoutCreateProfile"
              >
                {CREATE_PROFILE_LINK}
              </EuiLink>
            </EuiText>
          }
          helpText={lockedType ? LOCKED_PROFILE_HELP_TEXTS[lockedType] : PROFILE_HELP_TEXT}
          isInvalid={Boolean(profileState.error)}
          error={profileState.error?.message}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            options={profileOptions}
            selectedOptions={getSelectedProfileOptions(selectedProfile)}
            isInvalid={Boolean(profileState.error)}
            isDisabled={isSaving}
            inputRef={profileField.ref}
            onChange={([option]) => {
              if (option) {
                profileField.onChange(option.label);
              }
            }}
            // Creating nothing makes EuiComboBox drop text that matches no profile on blur or
            // Enter, which restores the selected profile.
            onCreateOption={() => {}}
            customOptionText={PROFILE_NO_MATCH}
            onBlur={profileField.onBlur}
            data-test-subj="searchBoostRuleFlyoutProfile"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={INDEX_PATTERN_LABEL}
              isInvalid={Boolean(indexPatternState.error)}
              error={indexPatternState.error?.message}
            >
              <IndexPatternField
                value={indexPatternField.value}
                placeholder={getIndexPatternPlaceholder(type ?? 'indices')}
                disabledReason={type ? undefined : SELECT_PROFILE_FIRST_TOOLTIP}
                isDisabled={isSaving}
                isInvalid={Boolean(indexPatternState.error)}
                inputRef={indexPatternField.ref}
                onChange={indexPatternField.onChange}
                onBlur={indexPatternField.onBlur}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={getPriorityStyles(euiTheme)}>
            <EuiFormRow
              label={PRIORITY_LABEL}
              isInvalid={Boolean(priorityState.error)}
              error={priorityState.error?.message}
            >
              <EuiFieldText
                inputMode="numeric"
                value={priorityField.value}
                isInvalid={Boolean(priorityState.error)}
                disabled={isSaving}
                inputRef={priorityField.ref}
                onChange={(event) =>
                  priorityField.onChange(event.target.value.replace(NON_DIGITS, ''))
                }
                onBlur={() => {
                  priorityField.onChange(String(parsePriority(priorityField.value)));
                  priorityField.onBlur();
                }}
                data-test-subj="searchBoostRuleFlyoutPriority"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {type ? (
          <>
            <EuiSpacer size="m" />
            <TargetList
              key={type}
              type={type}
              pattern={indexPatternField.value}
              targets={matchedTargets}
              isDisabled={isSaving}
              onSelect={indexPatternField.onChange}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {type && appliedMatches.length > 0 ? (
          <>
            <AppliesToFooter
              type={type}
              matches={exactMatches}
              storageSizeInBytes={appliedSizeInBytes}
              profile={selectedProfile}
            />
            <EuiHorizontalRule margin="m" />
          </>
        ) : null}
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              onClick={onClose}
              data-test-subj="searchBoostRuleFlyoutCancel"
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isSaving}
              onClick={handleSubmit(save)}
              data-test-subj="searchBoostRuleFlyoutSave"
            >
              {rule ? SAVE_CHANGES_BUTTON_LABEL : CREATE_RULE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
