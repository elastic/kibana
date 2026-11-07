/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PROFILE_TYPE_BY_DATA_SOURCE,
  findConflictingRule,
  matchesIndexPattern,
  resolveRule,
} from '../../../common/resolution';
import type {
  BoostProfileInput,
  BoostProfileType,
  BoostRule,
  BoostState,
} from '../../../common/types';
import { estimateRuleCost } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { PROVISIONING_NOTE } from '../../translations';
import { getCopyName } from '../copy_name';
import { CostEstimate } from '../cost_estimate';
import type { TargetPreview } from './pattern_matches';
import { PatternMatches, getPartialPattern } from './pattern_matches';
import { ClearableFieldText } from './clearable_field_text';
import { FLYOUT_WIDTH } from '../flyout_width';
import { CREATE_PROFILE_TITLE, ProfileFlyoutContent } from '../profiles/profile_flyout';
import { FlyoutOnTop, getFlyoutHistoryProps } from '../flyout_history';
import { useBoostState, useCreateRule, useUpdateRule } from '../../hooks/use_boost_state';
import { PROFILE_TYPE_LABELS } from '../format';
import type { RuleDraft, RuleDraftErrors } from './rule_draft';
import {
  createEmptyRuleDraft,
  getDraftPatterns,
  getRuleDraftErrors,
  hasRuleDraftErrors,
  normalizePriority,
  ruleDraftToInput,
  ruleToDraft,
} from './rule_draft';
import {
  PROFILE_REQUIRED_MESSAGE,
  RULE_NAME_ERROR_MESSAGES,
  INDEX_PATTERN_ERROR_MESSAGES,
  getPriorityConflictMessage,
} from './rule_messages';

interface RuleFlyoutProps {
  /** The rule to edit. Names can't change, and default rules can only change their profile. */
  rule?: BoostRule;
  /**
   * The flyout history it opens in, on top of the flyout that opened it, such as Index Management's
   * details, which its Back button returns to. The profile form then opens on top of it in turn.
   */
  historyKey?: symbol;
  /** A custom rule to copy into a new rule, which keeps its type. Ignored when editing. */
  duplicateOf?: BoostRule;
  /** Prefills the profile when creating, such as right after creating the profile. */
  initialProfileName?: string;
  onClose: () => void;
}

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

// The same for either type: Elasticsearch calls the syntax that matches data streams an index
// pattern too, and the placeholder and list show which type the field takes.
const TARGET_LABEL = i18n.translate('xpack.boost.ruleForm.indexTargetLabel', {
  defaultMessage: 'Index pattern or name',
});

// The tallest the list of matches grows.
const PREVIEW_MAX_HEIGHT = 320;

// The width of the priority beside the targets, which only needs room for a number.
const PRIORITY_WIDTH = 140;

const MANAGED_BADGE_LABEL = i18n.translate('xpack.boost.ruleForm.managedBadge', {
  defaultMessage: 'Managed',
});

// A profile name no saved profile can have, for estimating with a profile that isn't saved yet.
const NEW_PROFILE_NAME = '<new profile>';

const SELECT_PROFILE_FIRST = i18n.translate('xpack.boost.ruleForm.selectProfileFirst', {
  defaultMessage: 'Select a boost profile to choose targets.',
});

const PROFILE_HELP_TEXT = i18n.translate('xpack.boost.ruleForm.profileDescription', {
  defaultMessage:
    'Profile selection determines whether this rule applies to indices or data streams.',
});

// When editing, which lists only profiles of the rule's type.
const EDIT_PROFILE_HELP_TEXTS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.ruleForm.editIndicesProfileDescription', {
    defaultMessage:
      "Lists only indices profiles, since a rule can't switch types after it's created.",
  }),
  data_streams: i18n.translate('xpack.boost.ruleForm.editDataStreamsProfileDescription', {
    defaultMessage:
      "Lists only data stream profiles, since a rule can't switch types after it's created.",
  }),
};

const getInitialDraft = (
  rule: BoostRule | undefined,
  duplicateOf: BoostRule | undefined,
  initialProfileName: string | undefined,
  state: BoostState | undefined
): RuleDraft => {
  if (rule) {
    return ruleToDraft(rule);
  }
  if (duplicateOf) {
    const ruleNames = state?.rules.map(({ name }) => name) ?? [];
    return {
      ...ruleToDraft(duplicateOf),
      name: getCopyName(duplicateOf.name, ruleNames),
    };
  }
  return createEmptyRuleDraft(initialProfileName);
};

/** Creates a custom boost rule, from scratch or a copy, or edits a custom or default one. */
export const RuleFlyout = ({
  rule,
  historyKey,
  duplicateOf,
  initialProfileName,
  onClose,
}: RuleFlyoutProps) => {
  const { notifications } = useBoostServices();
  const { data: state } = useBoostState();
  const titleId = useGeneratedHtmlId();
  const profileTitleId = useGeneratedHtmlId();
  const [draft, setDraft] = useState<RuleDraft>(() =>
    getInitialDraft(rule, duplicateOf, initialProfileName, state)
  );
  const [showErrors, setShowErrors] = useState(false);
  // The last profile picked from the list, restored if the field is left empty or unmatched.
  const [lastProfileName, setLastProfileName] = useState(
    () => (rule ?? duplicateOf)?.boost_profile ?? initialProfileName ?? ''
  );
  // Remounting the picker clears text typed into it, which it otherwise keeps after a restore.
  const [profileFieldKey, setProfileFieldKey] = useState(0);
  // While creating a profile, the flyout shows the profile form in place of the rule's.
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  // Whether the profile field has focus. While it does, an estimate it made unavailable, such as
  // while the field is emptied to choose another, stays, faded. One the pattern makes unavailable
  // hides right away, since it no longer applies to anything.
  const [isEditingEstimateInput, setIsEditingEstimateInput] = useState(false);
  // Whether the list of matches shows hidden data sources.
  const [includesHidden, setIncludesHidden] = useState(false);
  // Set when leaving the profile form, so the link that opened it gets focus back.
  const shouldFocusCreateProfileRef = useRef(false);
  const createProfileLinkRef = useCallback((element: HTMLElement | null) => {
    if (element && shouldFocusCreateProfileRef.current) {
      shouldFocusCreateProfileRef.current = false;
      element.focus();
    }
  }, []);
  // Text typed into the picker, which it shows in place of the selected profile's name.
  const profileSearchRef = useRef('');
  // Set while the picker clears its search after a selection, which isn't the user editing.
  const isSelectingProfileRef = useRef(false);
  // A remount drops that pending clear, so a fresh picker has nothing to skip.
  useEffect(() => {
    isSelectingProfileRef.current = false;
  }, [profileFieldKey]);
  const { mutate: createRule, isLoading: isCreating } = useCreateRule();
  const { mutate: updateRule, isLoading: isUpdating } = useUpdateRule();
  const isSaving = isCreating || isUpdating;

  if (!state) {
    return null;
  }

  const isEditing = rule !== undefined;
  const { profiles, rules, data_sources: dataSources } = state;
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  // While the user types in the profile field, targets keep the last profile's type.
  const type = profilesByName.get(draft.profileName || lastProfileName)?.type;
  // Wording for the disabled target controls until a profile sets the type.
  const targetType = type ?? 'indices';
  // The rule being edited is replaced by the draft when previewing what the draft would apply to.
  const otherRules = rules.filter(({ name }) => name !== rule?.name);
  const draftErrors = getRuleDraftErrors(draft, isEditing ? [] : rules.map(({ name }) => name));
  const updateDraft = (changes: Partial<RuleDraft>) => setDraft({ ...draft, ...changes });

  const typedDataSources = dataSources
    .filter((dataSource) => PROFILE_TYPE_BY_DATA_SOURCE[dataSource.type] === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  // What the pattern reaches, and whether a higher-ranked rule still wins each target.
  const draftRule: BoostRule = {
    name: draft.name,
    index_patterns: getDraftPatterns(draft),
    boost_profile: draft.profileName,
    priority: Number(normalizePriority(draft.priority)),
    is_builtin: false,
  };
  const pattern = draft.pattern.trim();
  const previewPattern = (previewedPattern: string): TargetPreview[] => {
    const previewRule = { ...draftRule, index_patterns: [previewedPattern] };
    return typedDataSources
      .filter(({ name }) => matchesIndexPattern(previewedPattern, name))
      .map((dataSource) => {
        const winner = resolveRule(dataSource, [...otherRules, previewRule], profilesByName);
        return {
          name: dataSource.name,
          pattern: previewedPattern,
          overriddenBy: winner && winner !== previewRule ? winner.name : undefined,
          isHidden: dataSource.hidden,
        };
      });
  };
  const patternPreview = draftErrors.pattern ? [] : previewPattern(pattern);
  // Until it matches something, what contains it, ranked as if it were widened to match them.
  // Widening only adds wildcards, so it ranks the same however it's done.
  const partialPreview =
    !draftErrors.pattern && patternPreview.length === 0
      ? previewPattern(getPartialPattern(pattern))
      : [];

  // Elasticsearch rejects a rule that ties with another, since neither would apply over the other.
  const conflictingRule =
    draftErrors.profile || draftErrors.pattern
      ? undefined
      : findConflictingRule(draftRule, otherRules, profilesByName);
  const errors: RuleDraftErrors = {
    ...draftErrors,
    conflictsWith: conflictingRule?.name,
  };
  const visibleErrors = showErrors ? errors : {};

  const onSave = () => {
    // A priority that isn't usable shows what saving uses instead.
    const priority = normalizePriority(draft.priority);
    if (priority !== draft.priority) {
      updateDraft({ priority });
    }
    if (hasRuleDraftErrors(errors)) {
      setShowErrors(true);
      return;
    }
    const onSuccess = () => {
      notifications.toasts.addSuccess({
        title: isEditing
          ? i18n.translate('xpack.boost.ruleForm.savedToast', {
              defaultMessage: 'Saved boost rule "{name}"',
              values: { name: draft.name },
            })
          : i18n.translate('xpack.boost.ruleForm.createdToast', {
              defaultMessage: 'Created boost rule "{name}"',
              values: { name: draft.name },
            }),
        text: PROVISIONING_NOTE,
      });
      onClose();
    };

    if (isEditing) {
      updateRule(ruleDraftToInput(draft), { onSuccess });
    } else {
      createRule(ruleDraftToInput(draft), { onSuccess });
    }
  };

  // Elasticsearch can't move a rule to a profile of another type, so editing lists only its own.
  const savedProfileType = rule && profilesByName.get(rule.boost_profile)?.type;
  const profileOptions: Array<EuiComboBoxOptionOption<string>> = PROFILE_TYPES.filter(
    (profileType) => !savedProfileType || profileType === savedProfileType
  ).map((profileType) => ({
    label: PROFILE_TYPE_LABELS[profileType],
    isGroupLabelOption: true,
    options: profiles
      .filter((profile) => profile.type === profileType)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, is_builtin: isBuiltin }) => ({
        label: name,
        value: name,
        append: isBuiltin ? <EuiBadge>{MANAGED_BADGE_LABEL}</EuiBadge> : undefined,
      })),
  }));

  // The plain-text selection shows its option's append inside the field, before the arrow.
  const selectedProfileType = profilesByName.get(draft.profileName)?.type;
  const selectedProfileOptions: Array<EuiComboBoxOptionOption<string>> = draft.profileName
    ? [
        {
          label: draft.profileName,
          value: draft.profileName,
          append: selectedProfileType && (
            <EuiBadge color="hollow" data-test-subj="boostRuleProfileType">
              {PROFILE_TYPE_LABELS[selectedProfileType]}
            </EuiBadge>
          ),
        },
      ]
    : [];

  const onProfileChange = ([selected]: Array<EuiComboBoxOptionOption<string>>) => {
    // Backspace removes the selection, but it's kept while the field has text so the list still
    // checks it; onProfileSearchChange clears it once the field is empty.
    if (!selected?.value) {
      return;
    }
    const profileName = selected.value;
    isSelectingProfileRef.current = true;
    setLastProfileName(profileName);
    updateDraft({ profileName });
  };

  // An empty field would show the selected name again, so emptying it clears the selection.
  const onProfileSearchChange = (searchValue: string) => {
    profileSearchRef.current = searchValue;
    if (isSelectingProfileRef.current) {
      isSelectingProfileRef.current = false;
      return;
    }
    if (!searchValue) {
      setDraft((current) => ({ ...current, profileName: '' }));
    }
  };

  // Leaving the field empty, or with text that matches no profile, restores the last profile. Text
  // that matches one exactly selects it, which the picker does after this.
  const onProfileBlur = () => {
    setIsEditingEstimateInput(false);
    if (draft.profileName && !profileSearchRef.current) {
      return;
    }
    profileSearchRef.current = '';
    updateDraft({ profileName: lastProfileName });
    setProfileFieldKey(profileFieldKey + 1);
  };

  const closeProfileForm = () => {
    shouldFocusCreateProfileRef.current = true;
    setIsCreatingProfile(false);
  };

  // A profile created in the profile form is selected as if it were picked from the list.
  const onProfileCreate = (profileName: string) => {
    setLastProfileName(profileName);
    setDraft((current) => ({ ...current, profileName }));
    setProfileFieldKey(profileFieldKey + 1);
    closeProfileForm();
  };

  // The rule's own cost: what it applies to after higher-ranked rules, compared with the saved rule
  // when editing, or the original when duplicating.
  const hasValidTargets = !errors.pattern;
  const impact =
    draft.profileName && type && hasValidTargets
      ? estimateRuleCost({
          dataSources,
          rules,
          profiles,
          nextRule: draftRule,
          replacedRuleName: rule?.name,
          comparedRule: rule ?? duplicateOf,
        })
      : undefined;

  // The same, with a profile being created for this rule in the profile form.
  const estimateWithNewProfile = (profile: BoostProfileInput) =>
    hasValidTargets && profile.type === type
      ? estimateRuleCost({
          dataSources,
          rules,
          profiles: [...profiles, { ...profile, name: NEW_PROFILE_NAME, is_builtin: false }],
          nextRule: { ...draftRule, boost_profile: NEW_PROFILE_NAME },
          replacedRuleName: rule?.name,
        })
      : undefined;

  const hasHidden = typedDataSources.some(({ hidden }) => hidden);
  // A higher-ranked rule that would still apply to each data source if this rule named it, which the
  // list notes before it's chosen.
  const outrankedIfChosen = new Map(
    typedDataSources.flatMap((dataSource): Array<[string, string]> => {
      const namingRule = { ...draftRule, index_patterns: [dataSource.name] };
      const winner = resolveRule(dataSource, [...otherRules, namingRule], profilesByName);
      return winner && winner !== namingRule ? [[dataSource.name, winner.name]] : [];
    })
  );

  // A name chosen from the list becomes the rule's target, replacing what the field had.
  const selectName = (name: string) => {
    if (!isSaving) {
      updateDraft({ pattern: name });
    }
  };

  const nameError = visibleErrors.name && RULE_NAME_ERROR_MESSAGES[visibleErrors.name];
  const patternError = visibleErrors.pattern && INDEX_PATTERN_ERROR_MESSAGES[visibleErrors.pattern];

  const patternRow = (
    <EuiFormRow
      display="rowCompressed"
      label={TARGET_LABEL}
      isInvalid={Boolean(patternError)}
      error={patternError}
      fullWidth
    >
      <ClearableFieldText
        compressed
        fullWidth
        value={draft.pattern}
        onChange={({ target: { value } }) => updateDraft({ pattern: value })}
        onClear={() => updateDraft({ pattern: '' })}
        clearTestSubj="boostRulePatternClear"
        placeholder={i18n.translate('xpack.boost.ruleForm.patternPlaceholder', {
          defaultMessage: 'Example: {pattern} or {name}',
          values: {
            pattern: targetType === 'data_streams' ? 'logs-*' : 'products-*',
            name: targetType === 'data_streams' ? 'logs-app' : 'products',
          },
        })}
        isInvalid={Boolean(patternError)}
        disabled={isSaving || !type}
        data-test-subj="boostRulePattern"
      />
    </EuiFormRow>
  );

  const profileRow = (
    <EuiFormRow
      display="rowCompressed"
      label={i18n.translate('xpack.boost.ruleForm.profileLabel', {
        defaultMessage: 'Boost profile',
      })}
      labelAppend={
        <EuiText size="xs">
          <EuiLink
            ref={createProfileLinkRef}
            onClick={() => setIsCreatingProfile(true)}
            disabled={isSaving}
            data-test-subj="boostRuleCreateProfile"
          >
            {i18n.translate('xpack.boost.ruleForm.createProfileLink', {
              defaultMessage: 'Create profile',
            })}
          </EuiLink>
        </EuiText>
      }
      helpText={savedProfileType ? EDIT_PROFILE_HELP_TEXTS[savedProfileType] : PROFILE_HELP_TEXT}
      isInvalid={Boolean(visibleErrors.profile)}
      error={visibleErrors.profile && PROFILE_REQUIRED_MESSAGE}
      fullWidth
    >
      <EuiComboBox<string>
        key={profileFieldKey}
        compressed
        fullWidth
        singleSelection={{ asPlainText: true }}
        // A rule always needs a profile, so there's no clear button; see onProfileBlur.
        isClearable={false}
        onFocus={() => setIsEditingEstimateInput(true)}
        onBlur={onProfileBlur}
        options={profileOptions}
        selectedOptions={selectedProfileOptions}
        onChange={onProfileChange}
        onSearchChange={onProfileSearchChange}
        isInvalid={Boolean(visibleErrors.profile)}
        isDisabled={isSaving}
        data-test-subj="boostRuleProfile"
      />
    </EuiFormRow>
  );

  // Priority decides whether the targets follow this rule or a higher-ranked one. Leaving the field
  // corrects a priority that isn't usable, so its only error is a tie with another rule.
  const priorityError =
    visibleErrors.conflictsWith && type
      ? getPriorityConflictMessage(visibleErrors.conflictsWith)
      : undefined;
  const priorityRow = (
    <EuiFormRow
      display="rowCompressed"
      label={i18n.translate('xpack.boost.ruleForm.priorityLabel', {
        defaultMessage: 'Priority',
      })}
      isInvalid={Boolean(priorityError)}
      error={priorityError}
      fullWidth
    >
      <EuiFieldNumber
        compressed
        fullWidth
        value={draft.priority}
        onChange={({ target: { value } }) => updateDraft({ priority: value })}
        // Only digits can be typed, so the field never holds partial input such as "-", which it
        // would mark invalid. Shortcuts still work, and leaving the field corrects a pasted value.
        onKeyDown={(event) => {
          const { key, ctrlKey, metaKey, altKey } = event;
          if (key.length === 1 && !/\d/.test(key) && !ctrlKey && !metaKey && !altKey) {
            event.preventDefault();
          }
        }}
        onBlur={() => updateDraft({ priority: normalizePriority(draft.priority) })}
        // The arrows stop at 0. No step, so a pasted fraction isn't marked invalid either.
        min={0}
        isInvalid={Boolean(priorityError)}
        disabled={isSaving}
        data-test-subj="boostRulePriority"
      />
    </EuiFormRow>
  );

  const title = isEditing
    ? i18n.translate('xpack.boost.ruleForm.editTitle', {
        defaultMessage: 'Edit boost rule "{name}"',
        values: { name: draft.name },
      })
    : duplicateOf
    ? i18n.translate('xpack.boost.ruleForm.duplicateTitle', {
        defaultMessage: 'Duplicate boost rule "{name}"',
        values: { name: duplicateOf.name },
      })
    : i18n.translate('xpack.boost.ruleForm.createTitle', {
        defaultMessage: 'Create boost rule',
      });

  // On its own, both views share one flyout, so switching between them doesn't open another.
  const flyoutProps = {
    onClose,
    size: FLYOUT_WIDTH,
    paddingSize: 'm',
    'aria-labelledby': titleId,
    ownFocus: true,
    'data-test-subj': 'boostRuleFlyout',
    ...getFlyoutHistoryProps(historyKey, title),
  } as const;

  const renderProfileForm = (formTitleId: string) => (
    <ProfileFlyoutContent
      forRule={{
        ruleName: draft.name || undefined,
        type,
        isProjectDefault: false,
        estimate: estimateWithNewProfile,
        onCreate: onProfileCreate,
      }}
      takenNames={profiles.map(({ name }) => name)}
      titleId={formTitleId}
      onClose={closeProfileForm}
    />
  );

  if (isCreatingProfile && !historyKey) {
    return (
      <EuiFlyout
        {...flyoutProps}
        flyoutMenuProps={{ showBackButton: true, backButtonProps: { onClick: closeProfileForm } }}
      >
        {renderProfileForm(titleId)}
      </EuiFlyout>
    );
  }

  const ruleFlyout = (
    <EuiFlyout {...flyoutProps}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Names can't change after creation. */}
        {!isEditing && (
          <EuiFormRow
            display="rowCompressed"
            label={i18n.translate('xpack.boost.ruleForm.nameLabel', { defaultMessage: 'Name' })}
            helpText={i18n.translate('xpack.boost.ruleForm.nameHelp', {
              defaultMessage: 'Only lowercase letters, numbers, hyphens, and underscores allowed.',
            })}
            isInvalid={Boolean(nameError)}
            error={nameError}
            fullWidth
          >
            <EuiFieldText
              compressed
              fullWidth
              value={draft.name}
              onChange={({ target: { value } }) => updateDraft({ name: value })}
              isInvalid={Boolean(nameError)}
              disabled={isSaving}
              data-test-subj="boostRuleName"
            />
          </EuiFormRow>
        )}

        {profileRow}

        {/* EUI only spaces rows that are siblings, so the group takes the same space. */}
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            {/* The tooltip wraps the row, so the input stays the row's child and keeps its label.
                It only explains the disabled state, so it's dropped once a profile is chosen. */}
            {type ? (
              patternRow
            ) : (
              <EuiToolTip content={SELECT_PROFILE_FIRST} display="block">
                {patternRow}
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ inlineSize: PRIORITY_WIDTH }}>
            {priorityRow}
          </EuiFlexItem>
        </EuiFlexGroup>
        {/* What the rule can target depends on its profile's type, so it's listed once there is one. */}
        {type && (
          <>
            <EuiSpacer size="s" />
            <PatternMatches
              type={type}
              pattern={pattern}
              exactMatches={patternPreview}
              partialMatches={partialPreview}
              dataSources={typedDataSources}
              hasHidden={hasHidden}
              includesHidden={includesHidden}
              onIncludesHiddenChange={setIncludesHidden}
              maxHeight={PREVIEW_MAX_HEIGHT}
              onSelectName={selectName}
              outrankedIfChosen={outrankedIfChosen}
            />
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <CostEstimate
          impact={impact}
          type={type}
          isEditing={isEditingEstimateInput}
          showChange={isEditing || duplicateOf !== undefined}
        />
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={onClose}
              flush="left"
              data-test-subj="boostRuleCancel"
            >
              {i18n.translate('xpack.boost.ruleForm.cancelButton', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              onClick={onSave}
              isLoading={isSaving}
              data-test-subj="boostRuleSave"
            >
              {isEditing
                ? i18n.translate('xpack.boost.ruleForm.saveChangesButton', {
                    defaultMessage: 'Save changes',
                  })
                : i18n.translate('xpack.boost.ruleForm.createButton', {
                    defaultMessage: 'Create rule',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  // In a history, the profile form opens on top of the rule, which stays open behind it.
  return historyKey ? (
    <>
      {ruleFlyout}
      {isCreatingProfile && (
        <FlyoutOnTop
          historyKey={historyKey}
          title={CREATE_PROFILE_TITLE}
          onClose={closeProfileForm}
          size={FLYOUT_WIDTH}
          aria-labelledby={profileTitleId}
          data-test-subj="boostRuleProfileFlyout"
        >
          {renderProfileForm(profileTitleId)}
        </FlyoutOnTop>
      )}
    </>
  ) : (
    ruleFlyout
  );
};
