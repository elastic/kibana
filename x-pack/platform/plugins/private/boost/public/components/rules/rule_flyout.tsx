/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiComboBoxOptionOption, EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
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
  EuiHighlight,
  EuiLink,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiOverflowScroll,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  PROFILE_TYPE_BY_DATA_SOURCE,
  matchesIndexPattern,
  resolveRule,
} from '../../../common/resolution';
import type {
  BoostDataSource,
  BoostProfileInput,
  BoostProfileType,
  BoostRule,
  BoostState,
} from '../../../common/types';
import { BOOST_DOCS_URL } from '../../doc_links';
import { estimateRuleCost } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { LEARN_MORE_LABEL, PROVISIONING_NOTE } from '../../translations';
import { getCopyName } from '../copy_name';
import { CostEstimate } from '../cost_estimate';
import { SupersedingRule, TargetName } from './target_name';
import { FLYOUT_WIDTH } from '../flyout_width';
import { ProfileFlyoutContent } from '../profiles/profile_flyout';
import {
  useBoostState,
  useCreateRule,
  useUpdateDefaultRule,
  useUpdateRule,
} from '../../hooks/use_boost_state';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import type { RuleDraft } from './rule_draft';
import {
  createEmptyRuleDraft,
  getDraftPatterns,
  getRuleDraftErrors,
  hasRuleDraftErrors,
  ruleDraftToInput,
  ruleToDraft,
} from './rule_draft';
import {
  INDEX_PATTERN_ERROR_MESSAGES,
  PICKED_REQUIRED_MESSAGES,
  PROFILE_REQUIRED_MESSAGE,
  RULE_NAME_ERROR_MESSAGES,
  RULE_PRIORITY_ERROR_MESSAGES,
} from './rule_messages';

interface RuleFlyoutProps {
  /** The rule to edit. Names can't change, and default rules can only change their profile. */
  rule?: BoostRule;
  /** A custom rule to copy into a new rule, which keeps its type. Ignored when editing. */
  duplicateOf?: BoostRule;
  /** Prefills the profile when creating, such as right after creating the profile. */
  initialProfileName?: string;
  onClose: () => void;
}

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

const PICK_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.ruleForm.pickIndicesMode', {
    defaultMessage: 'Select indices',
  }),
  data_streams: i18n.translate('xpack.boost.ruleForm.pickDataStreamsMode', {
    defaultMessage: 'Select data streams',
  }),
};

// The height of the pattern's matches and the list to select from, so both modes take the same
// space.
const PREVIEW_HEIGHT = 240;

const MANAGED_BADGE_LABEL = i18n.translate('xpack.boost.ruleForm.managedBadge', {
  defaultMessage: 'Managed',
});

// A profile name no saved profile can have, for estimating with a profile that isn't saved yet.
const NEW_PROFILE_NAME = '<new profile>';

const SELECT_PROFILE_FIRST = i18n.translate('xpack.boost.ruleForm.selectProfileFirst', {
  defaultMessage: 'Select a boost profile to choose targets.',
});

const getProfileHelpText = (defaultRuleType: BoostProfileType | undefined) => {
  if (defaultRuleType === 'indices') {
    return i18n.translate('xpack.boost.ruleForm.defaultIndicesProfileDescription', {
      defaultMessage:
        "This rule applies to every index that no other rule matches. An Elastic-managed profile also sets simple mode's default for indices; a custom profile stops the two from syncing.",
    });
  }
  if (defaultRuleType === 'data_streams') {
    return i18n.translate('xpack.boost.ruleForm.defaultDataStreamsProfileDescription', {
      defaultMessage:
        "This rule applies to every data stream that no other rule matches. An Elastic-managed profile also sets simple mode's default for data streams; a custom profile stops the two from syncing.",
    });
  }
  return i18n.translate('xpack.boost.ruleForm.profileDescription', {
    defaultMessage:
      "The profile's type decides whether this rule applies to indices or data streams.",
  });
};

interface PickOptionData {
  /** A higher-ranked rule that keeps the data source if this rule targets it. */
  supersededBy?: string;
}

interface TargetPreview {
  name: string;
  /** A higher-ranked rule that still applies to this target, if any. */
  overriddenBy?: string;
}

const getInitialDraft = (
  rule: BoostRule | undefined,
  duplicateOf: BoostRule | undefined,
  initialProfileName: string | undefined,
  state: BoostState | undefined
): RuleDraft => {
  const existingNames = new Set(state?.data_sources.map(({ name }) => name));
  if (rule) {
    return ruleToDraft(rule, existingNames);
  }
  if (duplicateOf) {
    const ruleNames = state?.rules.map(({ name }) => name) ?? [];
    return {
      ...ruleToDraft(duplicateOf, existingNames),
      name: getCopyName(duplicateOf.name, ruleNames),
    };
  }
  return createEmptyRuleDraft(initialProfileName);
};

/** Creates a custom boost rule, from scratch or a copy, or edits a custom or default one. */
export const RuleFlyout = ({ rule, duplicateOf, initialProfileName, onClose }: RuleFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const { notifications } = useBoostServices();
  const { data: state } = useBoostState();
  const titleId = useGeneratedHtmlId();
  const modeIdPrefix = useGeneratedHtmlId({ prefix: 'ruleTargetMode' });
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
  // Whether the pattern or profile field has focus. While one does, an estimate it made
  // unavailable stays, faded.
  const [isEditingEstimateInput, setIsEditingEstimateInput] = useState(false);
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
  const { mutate: updateDefaultRule, isLoading: isUpdatingDefault } = useUpdateDefaultRule();
  const isSaving = isCreating || isUpdating || isUpdatingDefault;

  if (!state) {
    return null;
  }

  const isEditing = rule !== undefined;
  const isDefaultRule = rule?.is_builtin ?? false;
  const { profiles, rules, data_sources: dataSources } = state;
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  // While the user types in the profile field, targets keep the last profile's type.
  const type = profilesByName.get(draft.profileName || lastProfileName)?.type;
  // Wording for the disabled target controls until a profile sets the type.
  const targetType = type ?? 'indices';
  // A default rule keeps its type, so it only offers profiles of that type.
  const defaultRuleType =
    isDefaultRule && rule ? profilesByName.get(rule.boost_profile)?.type : undefined;
  // The rule being edited is replaced by the draft when previewing what the draft would apply to.
  const otherRules = rules.filter(({ name }) => name !== rule?.name);
  const draftErrors = getRuleDraftErrors(draft, isEditing ? [] : rules.map(({ name }) => name));
  const errors = isDefaultRule ? { profile: draftErrors.profile } : draftErrors;
  const visibleErrors = showErrors ? errors : {};
  const updateDraft = (changes: Partial<RuleDraft>) => setDraft({ ...draft, ...changes });

  const typedDataSources = dataSources
    .filter((dataSource) => PROFILE_TYPE_BY_DATA_SOURCE[dataSource.type] === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  const onSave = () => {
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

    if (defaultRuleType) {
      updateDefaultRule({ type: defaultRuleType, profileName: draft.profileName }, { onSuccess });
    } else if (isEditing) {
      updateRule(ruleDraftToInput(draft), { onSuccess });
    } else {
      createRule(ruleDraftToInput(draft), { onSuccess });
    }
  };

  const profileOptions: Array<EuiComboBoxOptionOption<string>> = (
    defaultRuleType ? [defaultRuleType] : PROFILE_TYPES
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
    const nextType = profilesByName.get(profileName)?.type;
    setLastProfileName(profileName);
    // Picked names only make sense for one type, so switching type clears them.
    updateDraft({ profileName, picked: nextType === type ? draft.picked : [] });
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
  const onProfileCreate = (profileName: string, profileType: BoostProfileType) => {
    setLastProfileName(profileName);
    setDraft((current) => ({
      ...current,
      profileName,
      picked: profileType === type ? current.picked : [],
    }));
    setProfileFieldKey(profileFieldKey + 1);
    closeProfileForm();
  };

  // What the pattern reaches, and whether a higher-ranked rule still wins each target.
  const draftRule: BoostRule = {
    name: draft.name,
    index_patterns: getDraftPatterns(draft),
    boost_profile: draft.profileName,
    priority: Number(draft.priority) || 0,
    is_builtin: false,
  };
  const patternPreview: TargetPreview[] =
    draft.mode === 'pattern' && !errors.pattern
      ? typedDataSources
          .filter(({ name }) => matchesIndexPattern(draft.pattern.trim(), name))
          .map((dataSource) => {
            const winner = resolveRule(dataSource, [...otherRules, draftRule], profilesByName);
            return {
              name: dataSource.name,
              overriddenBy: winner && winner !== draftRule ? winner.name : undefined,
            };
          })
      : [];

  // The rule's own cost: what it applies to after higher-ranked rules, compared with the saved rule
  // when editing, or the original when duplicating.
  const hasValidTargets =
    isDefaultRule || (draft.mode === 'pattern' ? !errors.pattern : draft.picked.length > 0);
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

  // A higher-ranked rule that would still apply to a data source if this rule targeted it, so the
  // list only notes the ones this rule can't take.
  const getSupersedingRule = (dataSource: BoostDataSource): string | undefined => {
    const targetingRule = { ...draftRule, index_patterns: [dataSource.name] };
    const winner = resolveRule(dataSource, [...otherRules, targetingRule], profilesByName);
    return winner && winner !== targetingRule ? winner.name : undefined;
  };

  const pickOptions: Array<EuiSelectableOption<PickOptionData>> = typedDataSources.map(
    (dataSource) => {
      const supersededBy = getSupersedingRule(dataSource);
      return {
        label: dataSource.name,
        checked: draft.picked.includes(dataSource.name) ? 'on' : undefined,
        supersededBy,
        // A list option can't hold a focusable tooltip, so the rule is described as text.
        append: supersededBy && (
          <EuiText size="xs" color="subdued">
            <SupersedingRule rule={supersededBy} hasTooltip={false} />
          </EuiText>
        ),
      };
    }
  );

  const modeToggle = (
    <EuiButtonGroup
      legend={i18n.translate('xpack.boost.ruleForm.targetModeLegend', {
        defaultMessage: 'How this rule chooses what it applies to',
      })}
      buttonSize="compressed"
      isFullWidth
      idSelected={`${modeIdPrefix}-${draft.mode}`}
      onChange={(id) =>
        updateDraft({
          mode: id === `${modeIdPrefix}-pick` ? 'pick' : 'pattern',
        })
      }
      options={[
        {
          id: `${modeIdPrefix}-pattern`,
          label: i18n.translate('xpack.boost.ruleForm.patternMode', {
            defaultMessage: 'Index pattern',
          }),
        },
        { id: `${modeIdPrefix}-pick`, label: PICK_LABELS[targetType] },
      ]}
      isDisabled={isSaving || !type}
      data-test-subj="boostRuleTargetMode"
    />
  );

  const nameError = visibleErrors.name && RULE_NAME_ERROR_MESSAGES[visibleErrors.name];
  const patternError = visibleErrors.pattern && INDEX_PATTERN_ERROR_MESSAGES[visibleErrors.pattern];
  const pickedError = visibleErrors.picked && type ? PICKED_REQUIRED_MESSAGES[type] : undefined;
  const priorityError =
    visibleErrors.priority && RULE_PRIORITY_ERROR_MESSAGES[visibleErrors.priority];

  // What a valid pattern matches, counted beside its label and listed below it.
  const hasPatternPreview = Boolean(type && draft.pattern.trim() && !errors.pattern);
  const matchesLabel = i18n.translate('xpack.boost.ruleForm.matchesLabel', {
    defaultMessage: 'Matches {targets}',
    values: { targets: formatDataSourceCount(type, patternPreview.length) },
  });
  const patternRow = (
    <EuiFormRow
      display="rowCompressed"
      label={i18n.translate('xpack.boost.ruleForm.patternLabel', {
        defaultMessage: 'Index pattern',
      })}
      labelAppend={
        hasPatternPreview && (
          <EuiText size="xs" color="subdued" data-test-subj="boostRulePatternMatchCount">
            {matchesLabel}
          </EuiText>
        )
      }
      isInvalid={Boolean(patternError)}
      error={patternError}
      fullWidth
    >
      <EuiFieldText
        compressed
        fullWidth
        value={draft.pattern}
        onChange={({ target: { value } }) => updateDraft({ pattern: value })}
        onFocus={() => setIsEditingEstimateInput(true)}
        onBlur={() => setIsEditingEstimateInput(false)}
        placeholder={targetType === 'data_streams' ? 'logs-*' : 'products-*'}
        isInvalid={Boolean(patternError)}
        disabled={isSaving || !type}
        data-test-subj="boostRulePattern"
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

  // Both views share one flyout, so switching between them doesn't open another.
  const flyoutProps = {
    onClose,
    size: FLYOUT_WIDTH,
    paddingSize: 'm',
    'aria-labelledby': titleId,
    ownFocus: true,
    'data-test-subj': 'boostRuleFlyout',
  } as const;

  if (isCreatingProfile) {
    return (
      <EuiFlyout
        {...flyoutProps}
        flyoutMenuProps={{ showBackButton: true, backButtonProps: { onClick: closeProfileForm } }}
      >
        <ProfileFlyoutContent
          forRule={{
            ruleName: draft.name || undefined,
            type,
            isTypeLocked: isDefaultRule,
            estimate: estimateWithNewProfile,
            onCreate: onProfileCreate,
          }}
          takenNames={profiles.map(({ name }) => name)}
          titleId={titleId}
          onClose={closeProfileForm}
        />
      </EuiFlyout>
    );
  }

  return (
    <EuiFlyout {...flyoutProps}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
        {isDefaultRule && (
          <>
            <EuiSpacer size="s" />
            <EuiBadge>
              {i18n.translate('xpack.boost.ruleForm.defaultBadge', { defaultMessage: 'Default' })}
            </EuiBadge>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* Names can't change after creation. */}
        {!isEditing && (
          <EuiFormRow
            display="rowCompressed"
            label={i18n.translate('xpack.boost.ruleForm.nameLabel', { defaultMessage: 'Name' })}
            helpText={i18n.translate('xpack.boost.ruleForm.nameHelp', {
              defaultMessage: 'Lowercase letters, numbers, hyphens, and underscores.',
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
          helpText={getProfileHelpText(defaultRuleType)}
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

        {/* Default rules always apply to everything else, so only their profile can change. */}
        {!isDefaultRule && (
          <>
            {/* Priority decides whether the targets below follow this rule or a higher one. */}
            <EuiFormRow
              display="rowCompressed"
              label={i18n.translate('xpack.boost.ruleForm.priorityLabel', {
                defaultMessage: 'Priority',
              })}
              helpText={
                <>
                  {i18n.translate('xpack.boost.ruleForm.priorityDescription', {
                    defaultMessage:
                      'When several rules match the same index or data stream, the highest priority applies. Default rules have priority 0.',
                  })}{' '}
                  <EuiLink href={BOOST_DOCS_URL} target="_blank" external>
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </>
              }
              isInvalid={Boolean(priorityError)}
              error={priorityError}
              fullWidth
            >
              <EuiFieldNumber
                compressed
                fullWidth
                value={draft.priority}
                onChange={({ target: { value } }) => updateDraft({ priority: value })}
                min={0}
                step={1}
                isInvalid={Boolean(priorityError)}
                disabled={isSaving}
                data-test-subj="boostRulePriority"
              />
            </EuiFormRow>

            <EuiFormRow
              display="rowCompressed"
              labelType="legend"
              label={i18n.translate('xpack.boost.ruleForm.targetsLabel', {
                defaultMessage: 'Targets',
              })}
              helpText={
                !type
                  ? SELECT_PROFILE_FIRST
                  : type === 'data_streams'
                  ? i18n.translate('xpack.boost.ruleForm.dataStreamsAppliesToDescription', {
                      defaultMessage:
                        'Enter one name or pattern, or select individual data streams.',
                    })
                  : i18n.translate('xpack.boost.ruleForm.indicesAppliesToDescription', {
                      defaultMessage: 'Enter one name or pattern, or select individual indices.',
                    })
              }
              fullWidth
            >
              {/* A wrapper takes the row's id, so the tooltip keeps its own. The tooltip only
                  explains the disabled state, so it's dropped once a profile is chosen. */}
              <div>
                {type ? (
                  modeToggle
                ) : (
                  <EuiToolTip content={SELECT_PROFILE_FIRST} display="block">
                    {modeToggle}
                  </EuiToolTip>
                )}
              </div>
            </EuiFormRow>

            {draft.mode === 'pattern' ? (
              <>
                {/* The tooltip wraps the row, so the input stays the row's child and keeps its
                    label. EUI spaces a row from the one above it, which the tooltip's wrapper
                    breaks, so the wrapper takes the same space. */}
                {type ? (
                  patternRow
                ) : (
                  <EuiToolTip
                    content={SELECT_PROFILE_FIRST}
                    display="block"
                    anchorProps={{ css: { marginBlockStart: euiTheme.size.base } }}
                  >
                    {patternRow}
                  </EuiToolTip>
                )}
                {hasPatternPreview && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiPanel
                      color="subdued"
                      hasBorder
                      hasShadow={false}
                      paddingSize="none"
                      data-test-subj="boostRulePatternMatches"
                    >
                      <div
                        tabIndex={0}
                        role="region"
                        aria-label={matchesLabel}
                        css={css`
                          ${scrollStyles}
                          max-block-size: ${PREVIEW_HEIGHT}px;
                          padding: ${euiTheme.size.s};
                          border-radius: inherit;
                        `}
                      >
                        {patternPreview.length > 0 ? (
                          patternPreview.map(({ name, overriddenBy }) => (
                            <EuiFlexGroup
                              key={name}
                              gutterSize="s"
                              justifyContent="spaceBetween"
                              responsive={false}
                              css={{ paddingBlock: euiTheme.size.xs }}
                            >
                              <EuiFlexItem grow={false}>
                                <EuiText size="xs">
                                  <TargetName name={name} supersededBy={overriddenBy} />
                                </EuiText>
                              </EuiFlexItem>
                              {overriddenBy && (
                                <EuiFlexItem grow={false}>
                                  <EuiText size="xs" color="subdued">
                                    <SupersedingRule rule={overriddenBy} />
                                  </EuiText>
                                </EuiFlexItem>
                              )}
                            </EuiFlexGroup>
                          ))
                        ) : (
                          <EuiText size="s" color="subdued">
                            <p>
                              {i18n.translate('xpack.boost.ruleForm.noMatchesYet', {
                                defaultMessage: 'Nothing matches yet.',
                              })}
                            </p>
                          </EuiText>
                        )}
                      </div>
                    </EuiPanel>
                  </>
                )}
              </>
            ) : (
              <EuiFormRow
                display="rowCompressed"
                label={PROFILE_TYPE_LABELS[targetType]}
                labelAppend={
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.boost.ruleForm.pickedCount', {
                      defaultMessage: '{count} selected',
                      values: { count: draft.picked.length },
                    })}
                  </EuiText>
                }
                isInvalid={Boolean(pickedError)}
                error={pickedError}
                fullWidth
              >
                <EuiSelectable
                  aria-label={PICK_LABELS[targetType]}
                  searchable
                  searchProps={{
                    compressed: true,
                    placeholder: i18n.translate('xpack.boost.ruleForm.pickSearchPlaceholder', {
                      defaultMessage: 'Search',
                    }),
                  }}
                  options={pickOptions}
                  // A selected name that a higher-ranked rule keeps is struck through, as in the
                  // rules table.
                  renderOption={({ label, checked, supersededBy }, searchValue) => (
                    <EuiHighlight
                      search={searchValue}
                      css={{
                        textDecoration:
                          checked === 'on' && supersededBy ? 'line-through' : undefined,
                      }}
                    >
                      {label}
                    </EuiHighlight>
                  )}
                  onChange={(options) =>
                    updateDraft({
                      picked: options
                        .filter(({ checked }) => checked === 'on')
                        .map(({ label }) => label),
                    })
                  }
                  listProps={{ bordered: true }}
                  height={PREVIEW_HEIGHT}
                  isLoading={isSaving}
                  data-test-subj="boostRulePicker"
                >
                  {(list, search) => (
                    <>
                      {search}
                      <EuiSpacer size="s" />
                      {list}
                    </>
                  )}
                </EuiSelectable>
              </EuiFormRow>
            )}
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
};
