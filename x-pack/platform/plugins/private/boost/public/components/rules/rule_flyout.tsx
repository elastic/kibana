/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import type { EuiComboBoxOptionOption, EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCode,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormLabel,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
import type { BoostDataSource, BoostProfileType, BoostRule } from '../../../common/types';
import { BOOST_DOCS_URL } from '../../doc_links';
import { useBoostServices } from '../../hooks/use_boost_services';
import { LEARN_MORE_LABEL, PROVISIONING_NOTE } from '../../translations';
import { useBoostState, useCreateRule } from '../../hooks/use_boost_state';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { FormSection } from '../profiles/form_section';
import type { RuleDraft } from './rule_draft';
import {
  createEmptyRuleDraft,
  getDraftPatterns,
  getRuleDraftErrors,
  hasRuleDraftErrors,
  ruleDraftToInput,
} from './rule_draft';
import {
  INDEX_PATTERN_ERROR_MESSAGES,
  PICKED_REQUIRED_MESSAGES,
  PROFILE_REQUIRED_MESSAGE,
  RULE_NAME_ERROR_MESSAGES,
  RULE_PRIORITY_ERROR_MESSAGES,
} from './rule_messages';

interface RuleFlyoutProps {
  /** Prefills the profile, such as when creating a rule right after creating its profile. */
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

const PATTERN_HELP: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.ruleForm.indicesPatternHelp', {
    defaultMessage:
      'One index name, or a pattern using * to match several. Indices created later that match use this rule automatically.',
  }),
  data_streams: i18n.translate('xpack.boost.ruleForm.dataStreamsPatternHelp', {
    defaultMessage:
      'One data stream name, or a pattern using * to match several. Data streams created later that match use this rule automatically.',
  }),
};

interface TargetPreview {
  name: string;
  /** A higher-ranked rule that still applies to this target, if any. */
  overriddenBy?: string;
}

/** Creates a custom boost rule. */
export const RuleFlyout = ({ initialProfileName, onClose }: RuleFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollStyles = useEuiOverflowScroll('y', true);
  const { notifications } = useBoostServices();
  const { data: state } = useBoostState();
  const titleId = useGeneratedHtmlId();
  const modeIdPrefix = useGeneratedHtmlId({ prefix: 'ruleTargetMode' });
  const [draft, setDraft] = useState<RuleDraft>(() => createEmptyRuleDraft(initialProfileName));
  const [showErrors, setShowErrors] = useState(false);
  const { mutate: createRule, isLoading: isSaving } = useCreateRule();

  if (!state) {
    return null;
  }

  const { profiles, rules, data_sources: dataSources } = state;
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const type = profilesByName.get(draft.profileName)?.type;
  const errors = getRuleDraftErrors(
    draft,
    rules.map(({ name }) => name)
  );
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
    createRule(ruleDraftToInput(draft), {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.boost.ruleForm.createdToast', {
            defaultMessage: 'Created boost rule "{name}"',
            values: { name: draft.name },
          }),
          text: PROVISIONING_NOTE,
        });
        onClose();
      },
    });
  };

  const profileOptions: Array<EuiComboBoxOptionOption<string>> = PROFILE_TYPES.map(
    (profileType) => ({
      label: PROFILE_TYPE_LABELS[profileType],
      isGroupLabelOption: true,
      options: profiles
        .filter((profile) => profile.type === profileType)
        .map(({ name }) => ({ label: name, value: name })),
    })
  );

  const onProfileChange = ([selected]: Array<EuiComboBoxOptionOption<string>>) => {
    const profileName = selected?.value ?? '';
    const nextType = profilesByName.get(profileName)?.type;
    // Picked names only make sense for one type, so switching type clears them.
    updateDraft({ profileName, picked: nextType === type ? draft.picked : [] });
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
            const winner = resolveRule(dataSource, [...rules, draftRule], profilesByName);
            return {
              name: dataSource.name,
              overriddenBy: winner && winner !== draftRule ? winner.name : undefined,
            };
          })
      : [];

  const getCurrentRuleName = (dataSource: BoostDataSource) =>
    resolveRule(dataSource, rules, profilesByName)?.name;

  const pickOptions: EuiSelectableOption[] = typedDataSources.map((dataSource) => ({
    label: dataSource.name,
    checked: draft.picked.includes(dataSource.name) ? 'on' : undefined,
    append: (
      <EuiText size="xs" color="subdued">
        {getCurrentRuleName(dataSource)}
      </EuiText>
    ),
  }));

  const nameError = visibleErrors.name && RULE_NAME_ERROR_MESSAGES[visibleErrors.name];
  const patternError = visibleErrors.pattern && INDEX_PATTERN_ERROR_MESSAGES[visibleErrors.pattern];
  const pickedError = visibleErrors.picked && type ? PICKED_REQUIRED_MESSAGES[type] : undefined;
  const priorityError =
    visibleErrors.priority && RULE_PRIORITY_ERROR_MESSAGES[visibleErrors.priority];

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      paddingSize="m"
      aria-labelledby={titleId}
      ownFocus
      data-test-subj="boostRuleFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.boost.ruleForm.createTitle', {
              defaultMessage: 'Create boost rule',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
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

        <FormSection
          title={i18n.translate('xpack.boost.ruleForm.profileTitle', {
            defaultMessage: 'Boost profile',
          })}
          description={i18n.translate('xpack.boost.ruleForm.profileDescription', {
            defaultMessage:
              "The profile's type decides whether this rule applies to indices or data streams.",
          })}
        >
          <EuiFormRow
            display="rowCompressed"
            isInvalid={Boolean(visibleErrors.profile)}
            error={visibleErrors.profile && PROFILE_REQUIRED_MESSAGE}
            fullWidth
          >
            <EuiComboBox<string>
              compressed
              fullWidth
              singleSelection={{ asPlainText: true }}
              options={profileOptions}
              selectedOptions={
                draft.profileName ? [{ label: draft.profileName, value: draft.profileName }] : []
              }
              onChange={onProfileChange}
              isInvalid={Boolean(visibleErrors.profile)}
              isDisabled={isSaving}
              aria-label={i18n.translate('xpack.boost.ruleForm.profileLabel', {
                defaultMessage: 'Boost profile',
              })}
              data-test-subj="boostRuleProfile"
            />
          </EuiFormRow>
        </FormSection>

        <FormSection
          title={i18n.translate('xpack.boost.ruleForm.targetsTitle', {
            defaultMessage: 'Targets',
          })}
          description={
            type === 'data_streams'
              ? i18n.translate('xpack.boost.ruleForm.dataStreamsAppliesToDescription', {
                  defaultMessage: 'Enter one name or pattern, or select individual data streams.',
                })
              : i18n.translate('xpack.boost.ruleForm.indicesAppliesToDescription', {
                  defaultMessage: 'Enter one name or pattern, or select individual indices.',
                })
          }
        >
          {!type ? (
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.boost.ruleForm.selectProfileFirst', {
                  defaultMessage: 'Select a boost profile first.',
                })}
              </p>
            </EuiText>
          ) : (
            <>
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
                  { id: `${modeIdPrefix}-pick`, label: PICK_LABELS[type] },
                ]}
                isDisabled={isSaving}
                data-test-subj="boostRuleTargetMode"
              />
              <EuiSpacer size="m" />
              {draft.mode === 'pattern' ? (
                <>
                  <EuiFormRow
                    display="rowCompressed"
                    label={i18n.translate('xpack.boost.ruleForm.patternLabel', {
                      defaultMessage: 'Index pattern',
                    })}
                    helpText={PATTERN_HELP[type]}
                    isInvalid={Boolean(patternError)}
                    error={patternError}
                    fullWidth
                  >
                    <EuiFieldText
                      compressed
                      fullWidth
                      value={draft.pattern}
                      onChange={({ target: { value } }) => updateDraft({ pattern: value })}
                      placeholder={type === 'data_streams' ? 'logs-*' : 'products-*'}
                      isInvalid={Boolean(patternError)}
                      disabled={isSaving}
                      data-test-subj="boostRulePattern"
                    />
                  </EuiFormRow>
                  {draft.pattern.trim() && !errors.pattern && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFormLabel>
                        {i18n.translate('xpack.boost.ruleForm.matchesLabel', {
                          defaultMessage: 'Matches {targets}',
                          values: { targets: formatDataSourceCount(type, patternPreview.length) },
                        })}
                      </EuiFormLabel>
                      <EuiSpacer size="xs" />
                      {patternPreview.length > 0 ? (
                        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
                          <div
                            tabIndex={0}
                            role="region"
                            aria-label={formatDataSourceCount(type, patternPreview.length)}
                            css={css`
                              ${scrollStyles}
                              max-block-size: ${euiTheme.base * 12}px;
                              padding: ${euiTheme.size.s};
                              border-radius: inherit;
                            `}
                          >
                            {patternPreview.map(({ name, overriddenBy }) => (
                              <EuiFlexGroup
                                key={name}
                                gutterSize="s"
                                justifyContent="spaceBetween"
                                responsive={false}
                                css={{ paddingBlock: euiTheme.size.xs }}
                              >
                                <EuiFlexItem grow={false}>
                                  <EuiText size="xs">
                                    <EuiCode>{name}</EuiCode>
                                  </EuiText>
                                </EuiFlexItem>
                                {overriddenBy && (
                                  <EuiFlexItem grow={false}>
                                    <EuiText size="xs" color="subdued">
                                      {i18n.translate('xpack.boost.ruleForm.overriddenBy', {
                                        defaultMessage: 'Higher-ranked rule: {rule}',
                                        values: { rule: overriddenBy },
                                      })}
                                    </EuiText>
                                  </EuiFlexItem>
                                )}
                              </EuiFlexGroup>
                            ))}
                          </div>
                        </EuiPanel>
                      ) : (
                        <EuiText size="s" color="subdued">
                          <p>
                            {i18n.translate('xpack.boost.ruleForm.noMatchesYet', {
                              defaultMessage: 'Nothing matches yet.',
                            })}
                          </p>
                        </EuiText>
                      )}
                    </>
                  )}
                </>
              ) : (
                <EuiFormRow
                  display="rowCompressed"
                  label={PROFILE_TYPE_LABELS[type]}
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
                    aria-label={PICK_LABELS[type]}
                    searchable
                    searchProps={{
                      compressed: true,
                      placeholder: i18n.translate('xpack.boost.ruleForm.pickSearchPlaceholder', {
                        defaultMessage: 'Search',
                      }),
                    }}
                    options={pickOptions}
                    onChange={(options) =>
                      updateDraft({
                        picked: options
                          .filter(({ checked }) => checked === 'on')
                          .map(({ label }) => label),
                      })
                    }
                    listProps={{ bordered: true }}
                    height={euiTheme.base * 15}
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
        </FormSection>

        <FormSection
          title={i18n.translate('xpack.boost.ruleForm.priorityTitle', {
            defaultMessage: 'Priority',
          })}
          description={
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
        >
          <EuiFormRow
            display="rowCompressed"
            isInvalid={Boolean(priorityError)}
            error={priorityError}
          >
            <EuiFieldNumber
              compressed
              value={draft.priority}
              onChange={({ target: { value } }) => updateDraft({ priority: value })}
              min={0}
              step={1}
              isInvalid={Boolean(priorityError)}
              disabled={isSaving}
              aria-label={i18n.translate('xpack.boost.ruleForm.priorityLabel', {
                defaultMessage: 'Priority',
              })}
              data-test-subj="boostRulePriority"
            />
          </EuiFormRow>
        </FormSection>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
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
              {i18n.translate('xpack.boost.ruleForm.createButton', {
                defaultMessage: 'Create rule',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
