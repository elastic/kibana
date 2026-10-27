/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  useEuiTheme,
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
  BoostDataSource,
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
import { SupersedingRule, getSupersedingDescription } from './target_name';
import { TARGET_LIST_HEADER_HEIGHT, TargetListHeader } from './target_list_header';
import type { TargetPreview } from './pattern_matches';
import { PatternMatches, getPartialPattern } from './pattern_matches';
import { FLYOUT_WIDTH } from '../flyout_width';
import { HiddenBadge } from '../hidden_data';
import { ProfileFlyoutContent } from '../profiles/profile_flyout';
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
  INDEX_PATTERN_ERROR_MESSAGES,
  PATTERN_NO_MATCHES_MESSAGES,
  PICKED_REQUIRED_MESSAGES,
  PROFILE_REQUIRED_MESSAGE,
  RULE_NAME_ERROR_MESSAGES,
  getPriorityConflictMessage,
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

// Heads the list to select from, as the tabs head the pattern's matches.
const PICKED_COUNT_FORMATS: Readonly<
  Record<BoostProfileType, (selected: number, total: number) => string>
> = {
  indices: (selected, total) =>
    i18n.translate('xpack.boost.ruleForm.pickedIndicesCount', {
      defaultMessage: 'Selected {selected} of {total, plural, one {# index} other {# indices}}',
      values: { selected, total },
    }),
  data_streams: (selected, total) =>
    i18n.translate('xpack.boost.ruleForm.pickedDataStreamsCount', {
      defaultMessage:
        'Selected {selected} of {total, plural, one {# data stream} other {# data streams}}',
      values: { selected, total },
    }),
};

const PICK_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.ruleForm.pickIndicesMode', {
    defaultMessage: 'Select indices',
  }),
  data_streams: i18n.translate('xpack.boost.ruleForm.pickDataStreamsMode', {
    defaultMessage: 'Select data streams',
  }),
};

// The tallest the pattern's matches and the list to select from grow, so both modes match.
const PREVIEW_MAX_HEIGHT = 320;

// The width of the priority beside the targets, which only needs room for a number.
const PRIORITY_WIDTH = 140;

// The height of each data source in the list to select from, which is EUI's default.
const PICK_ROW_HEIGHT = 32;

// The space around the data sources in the list to select from, like the pattern's matches: its
// panel's small padding.
const PICK_LIST_PADDING = 8;

const MANAGED_BADGE_LABEL = i18n.translate('xpack.boost.ruleForm.managedBadge', {
  defaultMessage: 'Managed',
});

// A profile name no saved profile can have, for estimating with a profile that isn't saved yet.
const NEW_PROFILE_NAME = '<new profile>';

const SELECT_PROFILE_FIRST = i18n.translate('xpack.boost.ruleForm.selectProfileFirst', {
  defaultMessage: 'Select a boost profile to choose targets.',
});

const SELECT_PROFILE_FOR_PATTERN = i18n.translate('xpack.boost.ruleForm.selectProfileForPattern', {
  defaultMessage: 'Select a boost profile to input an index pattern.',
});

const PROFILE_HELP_TEXT = i18n.translate('xpack.boost.ruleForm.profileDescription', {
  defaultMessage:
    "The profile's type decides whether this rule applies to indices or data streams.",
});

/** Passed to each option's renderer through EUI's `data`, which keeps it out of the page's HTML. */
interface PickOptionData {
  /** A higher-ranked rule that keeps the data source if this rule targets it. */
  supersededBy?: string;
  isHidden?: boolean;
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
  // Text typed to search the list to select from, which sizes the list to what it shows.
  const [pickSearch, setPickSearch] = useState('');
  // Whether the pattern's matches and the list to select from show hidden data sources.
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
          overriddenBy: winner && winner !== previewRule ? winner.name : undefined,
          isHidden: dataSource.hidden,
        };
      });
  };
  const isPatternPreviewable = draft.mode === 'pattern' && !draftErrors.pattern;
  const patternPreview = isPatternPreviewable ? previewPattern(pattern) : [];
  // Until the pattern matches something, what contains it, ranked as if the pattern were widened to
  // match them. Widening only adds wildcards, so it ranks the same however it's done.
  const partialPreview =
    isPatternPreviewable && patternPreview.length === 0
      ? previewPattern(getPartialPattern(pattern))
      : [];

  // A valid pattern has to match something, unless it's the rule's saved pattern, so a rule whose
  // targets have since gone can still be edited.
  const isSavedPattern = rule?.index_patterns.length === 1 && rule.index_patterns[0] === pattern;
  const hasNoMatches =
    draft.mode === 'pattern' &&
    !draftErrors.pattern &&
    patternPreview.length === 0 &&
    !isSavedPattern;
  // Elasticsearch rejects a rule that ties with another, since neither would apply over the other.
  const conflictingRule =
    draftErrors.profile || draftErrors.pattern || draftErrors.picked
      ? undefined
      : findConflictingRule(draftRule, otherRules, profilesByName);
  const errors: RuleDraftErrors = {
    ...draftErrors,
    patternMatches: hasNoMatches ? 'none' : undefined,
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

  const profileOptions: Array<EuiComboBoxOptionOption<string>> = PROFILE_TYPES.map(
    (profileType) => ({
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
    })
  );

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

  // The rule's own cost: what it applies to after higher-ranked rules, compared with the saved rule
  // when editing, or the original when duplicating.
  const hasValidTargets = draft.mode === 'pattern' ? !errors.pattern : draft.picked.length > 0;
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

  // Hidden data sources are left out until included, except selected ones, which stay in view.
  const pickOptions: Array<EuiSelectableOption<PickOptionData>> = typedDataSources
    .filter(({ name, hidden }) => includesHidden || !hidden || draft.picked.includes(name))
    .map((dataSource) => {
      const supersededBy = getSupersedingRule(dataSource);
      return {
        label: dataSource.name,
        checked: draft.picked.includes(dataSource.name) ? 'on' : undefined,
        data: { supersededBy, isHidden: dataSource.hidden },
        // A list option can't hold a focusable tooltip, so the option shows the explanation in its
        // own, on hover and when it's reached with the keyboard. EUI places it to the left.
        append: supersededBy && (
          <EuiText size="xs" color="subdued">
            <SupersedingRule rule={supersededBy} hasTooltip={false} />
          </EuiText>
        ),
        toolTipContent: supersededBy && getSupersedingDescription(supersededBy),
      };
    });
  const hasHidden = typedDataSources.some(({ hidden }) => hidden);
  // What the list shows before it's searched: hidden data sources only once shown, or selected.
  const pickableCount = pickOptions.length;

  // The list grows with what the search shows, up to the same height as the pattern's matches.
  // EUI only sizes a list to its options up to seven of them, so the height is set here.
  const searchedName = pickSearch.trim().toLowerCase();
  const pickListHeight = Math.min(
    pickOptions.filter(({ label }) => label.toLowerCase().includes(searchedName)).length *
      PICK_ROW_HEIGHT,
    // Less the heading and the panel's padding, top and bottom. Its border takes no space.
    PREVIEW_MAX_HEIGHT - TARGET_LIST_HEADER_HEIGHT - 2 * PICK_LIST_PADDING
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
  const patternError = visibleErrors.pattern
    ? INDEX_PATTERN_ERROR_MESSAGES[visibleErrors.pattern]
    : visibleErrors.patternMatches && type
    ? PATTERN_NO_MATCHES_MESSAGES[type]
    : undefined;
  const pickedError = visibleErrors.picked && type ? PICKED_REQUIRED_MESSAGES[type] : undefined;

  const patternRow = (
    <EuiFormRow
      display="rowCompressed"
      label={i18n.translate('xpack.boost.ruleForm.patternLabel', {
        defaultMessage: 'Index pattern',
      })}
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
        placeholder={i18n.translate('xpack.boost.ruleForm.patternPlaceholder', {
          defaultMessage: 'Example: {pattern}',
          values: { pattern: targetType === 'data_streams' ? 'logs-*' : 'products-*' },
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
      helpText={PROFILE_HELP_TEXT}
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
      ? getPriorityConflictMessage(type, visibleErrors.conflictsWith)
      : undefined;
  const priorityRow = (
    <EuiFormRow
      display="rowCompressed"
      label={i18n.translate('xpack.boost.ruleForm.priorityLabel', {
        defaultMessage: 'Priority',
      })}
      helpText={i18n.translate('xpack.boost.ruleForm.priorityDescription', {
        defaultMessage: 'Highest number wins.',
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
            isProjectDefault: false,
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

        {profileRow}

        <>
          {/* EUI only spaces rows that are siblings, so the group and the row after it take the
                same space. */}
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem>
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
                        defaultMessage: 'Enter a name or pattern, or select data streams.',
                      })
                    : i18n.translate('xpack.boost.ruleForm.indicesAppliesToDescription', {
                        defaultMessage: 'Enter a name or pattern, or select indices.',
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
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ inlineSize: PRIORITY_WIDTH }}>
              {priorityRow}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />

          {draft.mode === 'pattern' ? (
            <>
              {/* The tooltip wraps the row, so the input stays the row's child and keeps its
                    label. */}
              {type ? (
                patternRow
              ) : (
                <EuiToolTip content={SELECT_PROFILE_FOR_PATTERN} display="block">
                  {patternRow}
                </EuiToolTip>
              )}
              <EuiSpacer size="s" />
              <PatternMatches
                type={type}
                targetType={targetType}
                pattern={pattern}
                exactMatches={patternPreview}
                partialMatches={partialPreview}
                dataSources={typedDataSources}
                hasHidden={hasHidden}
                includesHidden={includesHidden}
                onIncludesHiddenChange={setIncludesHidden}
                maxHeight={PREVIEW_MAX_HEIGHT}
              />
            </>
          ) : (
            <EuiFormRow
              display="rowCompressed"
              label={PROFILE_TYPE_LABELS[targetType]}
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
                  onChange: setPickSearch,
                }}
                options={pickOptions}
                // A name that a higher-ranked rule would keep is struck through and disabled,
                // whether or not it's selected, until this rule's priority outranks that rule.
                renderOption={({ label, supersededBy, isHidden }, searchValue) => {
                  const name = (
                    <EuiHighlight
                      search={searchValue}
                      css={
                        supersededBy
                          ? { textDecoration: 'line-through', color: euiTheme.colors.textDisabled }
                          : undefined
                      }
                      data-test-subj={supersededBy ? 'boostSupersededTarget' : undefined}
                    >
                      {label}
                    </EuiHighlight>
                  );
                  // Centered on the name, as hidden names are in the other lists.
                  return isHidden ? (
                    <span
                      css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s }}
                    >
                      {name}
                      <HiddenBadge />
                    </span>
                  ) : (
                    name
                  );
                }}
                onChange={(options) =>
                  updateDraft({
                    picked: options
                      .filter(({ checked }) => checked === 'on')
                      .map(({ label }) => label),
                  })
                }
                listProps={{ rowHeight: PICK_ROW_HEIGHT }}
                height={pickListHeight}
                isLoading={isSaving}
                data-test-subj="boostRulePicker"
              >
                {(list, search) => (
                  <>
                    {search}
                    <EuiSpacer size="s" />
                    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
                      {/* How many are selected, of all the list shows, as the pattern's tab of
                        every data source counts them. Off until a profile is selected, as in the
                        pattern's matches, and the switch only while there's something hidden to
                        show, unless it's on already. */}
                      <TargetListHeader
                        includesHidden={includesHidden}
                        onIncludesHiddenChange={setIncludesHidden}
                        isShowHiddenDisabled={!type || (!hasHidden && !includesHidden)}
                      >
                        <EuiText
                          size="xs"
                          color={type ? 'subdued' : euiTheme.colors.textDisabled}
                          data-test-subj="boostRulePickedCount"
                        >
                          {PICKED_COUNT_FORMATS[targetType](draft.picked.length, pickableCount)}
                        </EuiText>
                      </TargetListHeader>
                      {/* Padding rather than the list's own, which it would count in its width. */}
                      <div css={{ padding: PICK_LIST_PADDING }}>{list}</div>
                    </EuiPanel>
                  </>
                )}
              </EuiSelectable>
            </EuiFormRow>
          )}
        </>
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
