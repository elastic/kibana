/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiCheckbox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_BOOST, MIN_BOOST } from '../../../common/constants';
import type { BoostProfile, BoostProfileInput, BoostProfileType } from '../../../common/types';
import type { CostImpact } from '../../../common/vcu_estimate';
import { estimateProfileCost } from '../../../common/vcu_estimate';
import { BOOST_DOCS_URL } from '../../doc_links';
import { useBoostServices } from '../../hooks/use_boost_services';
import { LEARN_MORE_LABEL, PROVISIONING_NOTE } from '../../translations';
import { useBoostState, useCreateProfile, useUpdateProfile } from '../../hooks/use_boost_state';
import { CardLabel } from '../card_label';
import { PROFILE_TYPE_LABELS } from '../format';
import { PresetCards } from '../preset_cards';
import type { PresetOption } from '../preset_options';
import { FLYOUT_WIDTH } from '../flyout_width';
import { BoostRangeInputs } from './boost_range_inputs';
import { FormSection, FormSubsection } from './form_section';
import type { AgedPeriodDraft, ProfileDraft } from './profile_draft';
import {
  createEmptyDraft,
  draftFromProfile,
  draftToProfileInput,
  getDraftErrors,
  getDraftProfile,
  hasDraftErrors,
} from './profile_draft';
import { PROFILE_NAME_ERROR_MESSAGES } from './profile_messages';
import { getCopyName } from '../copy_name';
import { CostEstimate } from '../cost_estimate';

/**
 * A new profile created from a rule's flyout or a project default's, which shows this form in place
 * of its own.
 */
export interface ProfileForRule {
  /** The rule's name, once it has one, to say which rule the profile is for. */
  ruleName?: string;
  /** The rule's current type, which the new profile starts with. */
  type?: BoostProfileType;
  /**
   * Whether the profile is for a project default, the profile its default rule uses, rather than a
   * custom rule. It takes the default's type, so the form doesn't offer one.
   */
  isProjectDefault: boolean;
  /** Estimates the rule's targets with the new profile, once the rule has some. */
  estimate: (profile: BoostProfileInput) => CostImpact | undefined;
  /** Called once the profile is created, to select it in the rule. */
  onCreate: (profileName: string, type: BoostProfileType) => void;
}

interface ProfileFlyoutProps {
  /** The custom profile to edit. */
  profile?: BoostProfile;
  /** A profile to copy into a new profile. Ignored when editing. */
  duplicateOf?: BoostProfile;
  takenNames: readonly string[];
  onClose: () => void;
  /** Offers "Save and create rule", called with the new profile's name instead of closing. */
  onCreateRule?: (profileName: string) => void;
}

interface ProfileFlyoutContentProps extends ProfileFlyoutProps {
  /** Shown in a rule flyout, for a new profile the rule then uses. */
  forRule?: ProfileForRule;
  /** The id for the title, which labels the flyout this content is in. */
  titleId: string;
}

// A stable callback ref, so it only runs when the input mounts.
const focusOnMount = (element: HTMLInputElement | null) => element?.focus();

const getInitialDraft = (
  profile: BoostProfile | undefined,
  duplicateOf: BoostProfile | undefined,
  forRule: ProfileForRule | undefined,
  takenNames: readonly string[]
): ProfileDraft => {
  if (profile) {
    return draftFromProfile(profile);
  }
  if (duplicateOf) {
    return { ...draftFromProfile(duplicateOf), name: getCopyName(duplicateOf.name, takenNames) };
  }
  const draft = createEmptyDraft();
  return forRule?.type ? { ...draft, type: forRule.type } : draft;
};

const TYPE_OPTIONS: ReadonlyArray<PresetOption<BoostProfileType>> = [
  {
    id: 'indices',
    label: i18n.translate('xpack.boost.profileForm.indicesType', { defaultMessage: 'Indices' }),
    description: i18n.translate('xpack.boost.profileForm.indicesTypeDescription', {
      defaultMessage: 'Regular indices. Supports an extra copy, prewarm, and pinned data.',
    }),
    isDefault: false,
  },
  {
    id: 'data_streams',
    label: i18n.translate('xpack.boost.profileForm.dataStreamsType', {
      defaultMessage: 'Data streams',
    }),
    description: i18n.translate('xpack.boost.profileForm.dataStreamsTypeDescription', {
      defaultMessage: 'Time-series data, boosted by age: recent, standard, and background.',
    }),
    isDefault: false,
  },
];

/** The indices options, with what each does. */
export const INDEX_OPTIONS: ReadonlyArray<{
  key: 'extraCopy' | 'prewarm' | 'pinned';
  title: string;
  description: string;
}> = [
  {
    key: 'extraCopy',
    title: i18n.translate('xpack.boost.profileForm.extraCopyTitle', {
      defaultMessage: 'One extra copy',
    }),
    description: i18n.translate('xpack.boost.profileForm.extraCopyDescription', {
      defaultMessage:
        "Keep an additional copy of the data so search isn't affected if one copy becomes unavailable.",
    }),
  },
  {
    key: 'prewarm',
    title: i18n.translate('xpack.boost.profileForm.prewarmTitle', { defaultMessage: 'Prewarm' }),
    description: i18n.translate('xpack.boost.profileForm.prewarmDescription', {
      defaultMessage: "Load data into cache ahead of time so the first query doesn't wait.",
    }),
  },
  {
    key: 'pinned',
    title: i18n.translate('xpack.boost.profileForm.pinnedTitle', { defaultMessage: 'Pinned' }),
    // At a min boost of 1 or more, all cached data is kept from eviction; below 1, a share of it.
    description: i18n.translate('xpack.boost.profileForm.pinnedDescription', {
      defaultMessage: 'Protect cached data in proportion to min boost.',
    }),
  },
];

// Pinned, which the prewarm option holds, since it needs prewarm.
const PINNED_OPTION = INDEX_OPTIONS.find(({ key }) => key === 'pinned') ?? INDEX_OPTIONS[0];

const PINNED_NEEDS_PREWARM = i18n.translate('xpack.boost.profileForm.pinnedNeedsPrewarm', {
  defaultMessage: 'Turn on prewarm to protect cached data.',
});

/** The profile form's header, body, and footer, for a flyout of its own or a rule's. */
export const ProfileFlyoutContent = ({
  profile,
  duplicateOf,
  forRule,
  takenNames,
  titleId,
  onClose,
  onCreateRule,
}: ProfileFlyoutContentProps) => {
  const { notifications } = useBoostServices();
  const optionsId = useGeneratedHtmlId({ prefix: 'boostProfileOptions' });
  const isEditing = profile !== undefined;

  const [draft, setDraft] = useState<ProfileDraft>(() =>
    getInitialDraft(profile, duplicateOf, forRule, takenNames)
  );
  const [showErrors, setShowErrors] = useState(false);
  const { euiTheme } = useEuiTheme();
  // While focus is in the boost values, an estimate they made unavailable stays, faded.
  const [isBoostFocused, setIsBoostFocused] = useState(false);

  const { data: state } = useBoostState();
  const { mutate: createProfile, isLoading: isCreating } = useCreateProfile();
  const { mutate: updateProfile, isLoading: isUpdating } = useUpdateProfile();
  const isSaving = isCreating || isUpdating;

  const errors = getDraftErrors(draft, isEditing ? [] : takenNames);
  const visibleErrors = showErrors ? errors : {};

  const updateDraft = (changes: Partial<ProfileDraft>) => setDraft({ ...draft, ...changes });
  const { indices, dataStreams } = draft;
  const { recent, standard, background } = dataStreams;
  const updatePeriod = (period: 'recent' | 'standard', changes: Partial<AgedPeriodDraft>) =>
    updateDraft({
      dataStreams: { ...dataStreams, [period]: { ...dataStreams[period], ...changes } },
    });

  const onSave = (createRule: boolean) => {
    if (hasDraftErrors(errors)) {
      setShowErrors(true);
      return;
    }

    const save = isEditing ? updateProfile : createProfile;
    save(draftToProfileInput(draft), {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.boost.profileForm.savedToast', {
            defaultMessage: 'Saved boost profile "{name}"',
            values: { name: draft.name },
          }),
          text: PROVISIONING_NOTE,
        });
        if (forRule) {
          forRule.onCreate(draft.name, draft.type);
        } else if (createRule && onCreateRule) {
          onCreateRule(draft.name);
        } else {
          onClose();
        }
      },
    });
  };

  const nameError = visibleErrors.name && PROFILE_NAME_ERROR_MESSAGES[visibleErrors.name];

  // Only a profile created for a rule has an estimate, for the rule's targets. A saved profile can
  // apply through any number of rules, so an estimate of it would be hard to read.
  const getImpact = (): CostImpact | undefined => {
    const draftProfile = getDraftProfile(draft);
    if (!draftProfile) {
      return undefined;
    }
    if (forRule) {
      return forRule.estimate(draftProfile);
    }
    // An edit is estimated across what rules apply the profile to today, against its saved settings.
    return profile && state
      ? estimateProfileCost({
          dataSources: state.data_sources,
          rules: state.rules,
          profiles: state.profiles,
          savedProfile: profile,
          nextProfile: draftProfile,
        })
      : undefined;
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {isEditing
              ? i18n.translate('xpack.boost.profileForm.editTitle', {
                  defaultMessage: 'Edit boost profile "{profileName}"',
                  values: { profileName: draft.name },
                })
              : duplicateOf
              ? i18n.translate('xpack.boost.profileForm.duplicateTitle', {
                  defaultMessage: 'Duplicate boost profile "{name}"',
                  values: { name: duplicateOf.name },
                })
              : forRule?.isProjectDefault
              ? i18n.translate('xpack.boost.profileForm.createForDefaultTitle', {
                  defaultMessage:
                    'Create boost profile for the {type, select, indices {indices} other {data streams}} default',
                  values: { type: draft.type },
                })
              : forRule?.ruleName
              ? i18n.translate('xpack.boost.profileForm.createForRuleTitle', {
                  defaultMessage: 'Create boost profile for rule "{ruleName}"',
                  values: { ruleName: forRule.ruleName },
                })
              : forRule
              ? i18n.translate('xpack.boost.profileForm.createForNewRuleTitle', {
                  defaultMessage: 'Create boost profile for new rule',
                })
              : i18n.translate('xpack.boost.profileForm.createTitle', {
                  defaultMessage: 'Create boost profile',
                })}
          </h2>
        </EuiTitle>
        {/* The name and type can't change after creation, so editing shows them read-only here. */}
        {isEditing && (
          <>
            <EuiSpacer size="s" />
            <EuiBadge color="hollow" data-test-subj="boostProfileType">
              {PROFILE_TYPE_LABELS[draft.type]}
            </EuiBadge>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {!isEditing && (
          <>
            <EuiFormRow
              display="rowCompressed"
              label={i18n.translate('xpack.boost.profileForm.nameLabel', {
                defaultMessage: 'Name',
              })}
              helpText={i18n.translate('xpack.boost.profileForm.nameHelp', {
                defaultMessage: 'Lowercase letters, numbers, hyphens, and underscores.',
              })}
              isInvalid={Boolean(nameError)}
              error={nameError}
              fullWidth
            >
              <EuiFieldText
                compressed
                value={draft.name}
                onChange={({ target: { value } }) => updateDraft({ name: value })}
                isInvalid={Boolean(nameError)}
                disabled={isSaving}
                fullWidth
                // In a rule flyout, the form replaces the rule's, so focus moves to its first field.
                inputRef={forRule ? focusOnMount : undefined}
                data-test-subj="boostProfileName"
              />
            </EuiFormRow>

            {/* A profile for a project default takes the default's type, which the title names. */}
            {!forRule?.isProjectDefault && (
              <FormSection
                title={i18n.translate('xpack.boost.profileForm.typeTitle', {
                  defaultMessage: 'Type',
                })}
                description={i18n.translate('xpack.boost.profileForm.typeDescription', {
                  defaultMessage: "The type can't be changed after the profile is created.",
                })}
              >
                <PresetCards
                  name="boostProfileType"
                  options={TYPE_OPTIONS}
                  selectedId={draft.type}
                  onChange={(type) => updateDraft({ type })}
                  disabled={isSaving}
                  direction="row"
                />
              </FormSection>
            )}
          </>
        )}

        <FormSection
          // When editing, Boost comes first, right under the header's own border.
          hasDivider={!isEditing}
          title={i18n.translate('xpack.boost.profileForm.boostTitle', {
            defaultMessage: 'Boost',
          })}
          description={
            <>
              {i18n.translate('xpack.boost.profileForm.boostDescription', {
                defaultMessage:
                  'The default is 1. Higher values handle more queries; lower values cost less. Enter values from {min} to {max}.',
                values: { min: MIN_BOOST, max: MAX_BOOST.toLocaleString(i18n.getLocale()) },
              })}{' '}
              <EuiLink href={BOOST_DOCS_URL} target="_blank" external>
                {LEARN_MORE_LABEL}
              </EuiLink>
            </>
          }
        >
          {/* Focus moving between the boost values keeps a faded estimate; leaving them hides it. */}
          <div
            onFocus={() => setIsBoostFocused(true)}
            onBlur={({ currentTarget, relatedTarget }) =>
              setIsBoostFocused(currentTarget.contains(relatedTarget))
            }
          >
            {draft.type === 'indices' ? (
              <BoostRangeInputs
                range={indices}
                onChange={(range) => updateDraft({ indices: { ...indices, ...range } })}
                error={visibleErrors.indicesRange}
                disabled={isSaving}
                testSubjPrefix="indices"
              />
            ) : (
              <>
                <FormSubsection
                  title={i18n.translate('xpack.boost.profileForm.recentTitle', {
                    defaultMessage: 'Recent',
                  })}
                >
                  <BoostRangeInputs
                    range={recent}
                    onChange={(range) => updatePeriod('recent', range)}
                    error={visibleErrors.recentRange}
                    maxAge={{
                      value: recent.maxAge,
                      unit: recent.maxAgeUnit,
                      onChange: (maxAge) => updatePeriod('recent', { maxAge }),
                      onUnitChange: (maxAgeUnit) => updatePeriod('recent', { maxAgeUnit }),
                      error: visibleErrors.recentMaxAge,
                    }}
                    disabled={isSaving}
                    testSubjPrefix="recent"
                  />
                </FormSubsection>
                <EuiSpacer size="s" />
                <FormSubsection
                  title={i18n.translate('xpack.boost.profileForm.standardTitle', {
                    defaultMessage: 'Standard',
                  })}
                >
                  <BoostRangeInputs
                    range={standard}
                    onChange={(range) => updatePeriod('standard', range)}
                    error={visibleErrors.standardRange}
                    maxAge={{
                      value: standard.maxAge,
                      unit: standard.maxAgeUnit,
                      onChange: (maxAge) => updatePeriod('standard', { maxAge }),
                      onUnitChange: (maxAgeUnit) => updatePeriod('standard', { maxAgeUnit }),
                      error: visibleErrors.standardMaxAge,
                    }}
                    disabled={isSaving}
                    testSubjPrefix="standard"
                  />
                </FormSubsection>
                <EuiSpacer size="s" />
                <FormSubsection
                  title={i18n.translate('xpack.boost.profileForm.backgroundTitle', {
                    defaultMessage: 'Background',
                  })}
                >
                  <BoostRangeInputs
                    range={background}
                    onChange={(range) =>
                      updateDraft({ dataStreams: { ...dataStreams, background: range } })
                    }
                    error={visibleErrors.backgroundRange}
                    reserveMaxAgeColumn
                    disabled={isSaving}
                    testSubjPrefix="background"
                  />
                </FormSubsection>
              </>
            )}
          </div>
        </FormSection>

        {draft.type === 'indices' && (
          <FormSection
            title={i18n.translate('xpack.boost.profileForm.optionsTitle', {
              defaultMessage: 'Additional options',
            })}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              {INDEX_OPTIONS.filter(({ key }) => key !== 'pinned').map(
                ({ key, title, description }) => (
                  <EuiFlexItem key={key}>
                    <EuiCheckableCard
                      id={`${optionsId}-${key}`}
                      checkableType="checkbox"
                      label={
                        <CardLabel title={title} description={description} isDisabled={isSaving} />
                      }
                      checked={indices[key]}
                      onChange={() =>
                        updateDraft({
                          indices: {
                            ...indices,
                            [key]: !indices[key],
                            // Only prewarmed data can be pinned, so turning prewarm off turns pinned
                            // off too.
                            ...(key === 'prewarm' && indices.prewarm ? { pinned: false } : {}),
                          },
                        })
                      }
                      disabled={isSaving}
                      data-test-subj={`boostProfileOption-${key}`}
                    >
                      {/* Pinned is part of prewarm, in its card's body, usable once prewarm is on. */}
                      {key === 'prewarm' && (
                        <EuiCheckbox
                          id={`${optionsId}-pinned`}
                          // Its name in the regular weight, as a checkbox's label is, with what it does
                          // right below.
                          label={
                            <>
                              {PINNED_OPTION.title}
                              <EuiText
                                size="xs"
                                color={
                                  isSaving || !indices.prewarm
                                    ? euiTheme.colors.disabledText
                                    : 'subdued'
                                }
                              >
                                {PINNED_OPTION.description}
                                {!indices.prewarm && (
                                  <EuiScreenReaderOnly>
                                    <span> {PINNED_NEEDS_PREWARM}</span>
                                  </EuiScreenReaderOnly>
                                )}
                              </EuiText>
                            </>
                          }
                          checked={indices.pinned && indices.prewarm}
                          onChange={() =>
                            updateDraft({ indices: { ...indices, pinned: !indices.pinned } })
                          }
                          disabled={isSaving || !indices.prewarm}
                          data-test-subj="boostProfileOption-pinned"
                        />
                      )}
                    </EuiCheckableCard>
                  </EuiFlexItem>
                )
              )}
            </EuiFlexGroup>
          </FormSection>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {/* For a profile a rule will use, or one rules use already, which shows when anything does
            and how the edit changes its cost. */}
        {(forRule || profile) && (
          <CostEstimate
            impact={getImpact()}
            type={draft.type}
            isEditing={isBoostFocused}
            showChange={!forRule}
          />
        )}
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={onClose}
              flush="left"
              data-test-subj="boostProfileCancel"
            >
              {i18n.translate('xpack.boost.profileForm.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {forRule ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    onClick={() => onSave(false)}
                    isLoading={isSaving}
                    data-test-subj="boostProfileSaveAndUse"
                  >
                    {forRule.isProjectDefault
                      ? i18n.translate('xpack.boost.profileForm.saveAndUseAsDefaultButton', {
                          defaultMessage: 'Save and use as default',
                        })
                      : i18n.translate('xpack.boost.profileForm.saveAndUseButton', {
                          defaultMessage: 'Save and use in rule',
                        })}
                  </EuiButton>
                </EuiFlexItem>
              ) : isEditing ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    onClick={() => onSave(false)}
                    isLoading={isSaving}
                    data-test-subj="boostProfileSave"
                  >
                    {i18n.translate('xpack.boost.profileForm.saveChangesButton', {
                      defaultMessage: 'Save changes',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              ) : (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      fill={!onCreateRule}
                      onClick={() => onSave(false)}
                      isLoading={isSaving}
                      data-test-subj="boostProfileSave"
                    >
                      {i18n.translate('xpack.boost.profileForm.saveButton', {
                        defaultMessage: 'Save',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  {onCreateRule && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        fill
                        onClick={() => onSave(true)}
                        isLoading={isSaving}
                        data-test-subj="boostProfileSaveAndCreateRule"
                      >
                        {i18n.translate('xpack.boost.profileForm.saveAndCreateRuleButton', {
                          defaultMessage: 'Save and create rule',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export const ProfileFlyout = (props: ProfileFlyoutProps) => {
  const { onClose } = props;
  const titleId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      onClose={onClose}
      size={FLYOUT_WIDTH}
      paddingSize="m"
      aria-labelledby={titleId}
      ownFocus
      data-test-subj="boostProfileFlyout"
    >
      <ProfileFlyoutContent {...props} titleId={titleId} />
    </EuiFlyout>
  );
};
