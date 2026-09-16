/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import type { EuiSelectableOnChangeEvent } from '@elastic/eui/src/components/selectable/selectable';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiButton,
  EuiButtonEmpty,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionPolicyResponse, MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useFormContext, useWatch } from 'react-hook-form';
import { useRuleFormServices } from '../../../form/contexts';
import type { FormValues } from '../../../form/types';
import { useCreateActionPolicySecondaryFlyout } from '../create_action_policy_secondary_flyout_context';
import { useMatchedActionPolicies } from './use_matched_action_policies';
import { isCatchAllActionPolicy, useFindActionPolicies } from './use_find_action_policies';
import { parseRuleTagsFromMatcher } from './parse_rule_tags_from_matcher';

/**
 * Details: Applied policies come from `_match_for_rule`.
 * Link popover lists non–catch-all policies whose matcher includes `rule.tags`.
 * Create opens the essential action-policy flyout.
 */

const LINK_SELECTABLE_LIST_MAX_HEIGHT = 320;

type MatchKind = 'catch-all' | 'tags' | 'expression';
type TriggerKind = 'email' | 'slack';

interface PrototypePolicy {
  id: string;
  name: string;
  matchKinds: MatchKind[];
  scopeTags: string[];
  expression?: string;
  destinationName?: string;
  triggers: TriggerKind[];
}

/** Map API match results into the expandable card model. */
const toMatchedPolicyCard = (matched: MatchedActionPolicy): PrototypePolicy => {
  const { actionPolicy, category } = matched;
  const scopeTags = actionPolicy.tags ?? [];
  const expression = actionPolicy.matcher ?? undefined;

  let matchKinds: MatchKind[];
  if (category === 'global') {
    matchKinds = ['catch-all'];
  } else {
    matchKinds = [];
    if (scopeTags.length > 0) {
      matchKinds.push('tags');
    }
    if (expression) {
      matchKinds.push('expression');
    }
    if (matchKinds.length === 0) {
      matchKinds = ['expression'];
    }
  }

  const destinationName =
    actionPolicy.destinations?.[0]?.type === 'workflow'
      ? actionPolicy.destinations[0].id
      : undefined;

  return {
    id: actionPolicy.id,
    name: actionPolicy.name,
    matchKinds,
    scopeTags,
    expression,
    destinationName,
    triggers: ['email', 'slack'],
  };
};

const TRIGGER_ICON: Record<TriggerKind, string> = {
  email: 'mail',
  slack: 'logoSlack',
};

const MATCH_KIND_LABEL: Record<MatchKind, string> = {
  'catch-all': i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.match.catchAll',
    { defaultMessage: 'catch-all' }
  ),
  tags: i18n.translate('xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.match.tags', {
    defaultMessage: 'Tags',
  }),
  expression: i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.match.expression',
    { defaultMessage: 'Expression' }
  ),
};

const MATCH_KIND_ICON: Partial<Record<MatchKind, string>> = {
  tags: 'tag',
  expression: 'code',
};

const getLinkableTags = (policy: ActionPolicyResponse): string[] =>
  parseRuleTagsFromMatcher(policy.matcher);

const isLinkableActionPolicy = (
  policy: ActionPolicyResponse,
  appliedPolicyIds: Set<string>
): boolean => {
  if (appliedPolicyIds.has(policy.id)) {
    return false;
  }
  if (isCatchAllActionPolicy(policy)) {
    return false;
  }
  return getLinkableTags(policy).length > 0;
};

type LinkablePolicySelectableOption = EuiSelectableOption & {
  policy?: ActionPolicyResponse;
};

const ActionPolicyCard = ({
  policy,
  isExpanded,
  onToggle,
  onRemoveMatchingTags,
  ruleTags = [],
}: {
  policy: PrototypePolicy;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveMatchingTags?: (tags: string[]) => void;
  ruleTags?: string[];
}) => {
  const isCatchAll = policy.matchKinds.includes('catch-all');
  const overlappingTags = policy.scopeTags.filter((tag) => ruleTags.includes(tag));
  const canRemoveTags =
    Boolean(onRemoveMatchingTags) && !isCatchAll && overlappingTags.length > 0;

  const removeLabel = i18n.translate(
    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.removeMatchingTags',
    { defaultMessage: 'Remove matching tags from rule' }
  );

  return (
    <EuiPanel
      paddingSize="s"
      hasBorder
      data-test-subj={`linkedActionPolicyCard-${policy.id}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            color="text"
            aria-label={
              isExpanded
                ? i18n.translate(
                    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.collapsePolicy',
                    {
                      defaultMessage: 'Collapse {name}',
                      values: { name: policy.name },
                    }
                  )
                : i18n.translate(
                    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.expandPolicy',
                    {
                      defaultMessage: 'Expand {name}',
                      values: { name: policy.name },
                    }
                  )
            }
            onClick={onToggle}
            data-test-subj={`linkedActionPolicyExpand-${policy.id}`}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{policy.name}</strong>
              </EuiText>
            </EuiFlexItem>
            {policy.triggers.map((trigger) => (
              <EuiFlexItem grow={false} key={trigger}>
                <EuiToolTip content={trigger === 'email' ? 'Email' : 'Slack'}>
                  <EuiIcon
                    type={TRIGGER_ICON[trigger]}
                    size="m"
                    aria-label={trigger === 'email' ? 'Email' : 'Slack'}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            {policy.matchKinds.map((kind) =>
              kind === 'catch-all' ? (
                <EuiFlexItem grow={false} key={kind}>
                  <EuiBadge color="hollow">{MATCH_KIND_LABEL[kind]}</EuiBadge>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false} key={kind}>
                  <EuiToolTip content={MATCH_KIND_LABEL[kind]}>
                    <EuiBadge
                      color={kind === 'expression' ? 'default' : 'hollow'}
                      iconType={MATCH_KIND_ICON[kind]}
                      aria-label={MATCH_KIND_LABEL[kind]}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )
            )}
            {canRemoveTags && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    color="danger"
                    iconType="trash"
                    aria-label={removeLabel}
                    onClick={() => onRemoveMatchingTags?.(overlappingTags)}
                    data-test-subj={`linkedActionPolicyRemoveTags-${policy.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded && (
        <>
          <EuiHorizontalRule margin="s" />
          <div>
            {(isCatchAll || policy.scopeTags.length > 0) && (
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      Scope:
                    </EuiText>
                  </EuiFlexItem>
                  {isCatchAll ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        {i18n.translate(
                          'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.catchAllScope',
                          { defaultMessage: 'Catch-all' }
                        )}
                      </EuiBadge>
                    </EuiFlexItem>
                  ) : (
                    policy.scopeTags.map((tag) => (
                      <EuiFlexItem grow={false} key={tag}>
                        <EuiBadge color="hollow">{tag}</EuiBadge>
                      </EuiFlexItem>
                    ))
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
              </>
            )}

            {policy.expression && (
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      Expression:
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCode>{policy.expression}</EuiCode>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
              </>
            )}

            {policy.destinationName && (
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    Destination:
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPanel paddingSize="xs" hasBorder color="subdued">
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">{policy.destinationName}</EuiText>
                      </EuiFlexItem>
                      {policy.triggers.map((trigger) => (
                        <EuiFlexItem grow={false} key={trigger}>
                          <EuiIcon
                            type={TRIGGER_ICON[trigger]}
                            size="m"
                            aria-label={trigger === 'email' ? 'Email' : 'Slack'}
                          />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        </>
      )}
    </EuiPanel>
  );
};

/** Details step: rule tags drive matching; Applied is a live match preview. */
export const LinkedActionPoliciesMatchingSection = ({ ruleId }: { ruleId?: string }) => {
  const { http, CreateActionPolicyFlyout } = useRuleFormServices();
  const { open: openCreateActionPolicyFlyout } = useCreateActionPolicySecondaryFlyout();
  const queryClient = useQueryClient();
  const { setValue, getValues } = useFormContext<FormValues>();
  const { euiTheme } = useEuiTheme();
  const metadata = useWatch<FormValues, 'metadata'>({ name: 'metadata' });
  const ruleName = metadata?.name;
  const ruleTags = metadata?.tags ?? [];

  const { isLoading, items: matchedItems } = useMatchedActionPolicies({
    http,
    ruleId,
    name: ruleName,
    tags: ruleTags,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const linkPopoverTitleId = useGeneratedHtmlId({ prefix: 'linkActionPolicyTitle' });

  const appliedPolicies = useMemo(
    () => matchedItems.map(toMatchedPolicyCard),
    [matchedItems]
  );
  const appliedPolicyIds = useMemo(
    () => new Set(appliedPolicies.map((policy) => policy.id)),
    [appliedPolicies]
  );

  const { items: findablePolicies, isLoading: isLoadingLinkable } = useFindActionPolicies({
    http,
    enabled: isLinkPopoverOpen,
  });

  const closeLinkPopover = () => {
    setIsLinkPopoverOpen(false);
  };

  const linkablePolicies = useMemo(
    () => findablePolicies.filter((policy) => isLinkableActionPolicy(policy, appliedPolicyIds)),
    [findablePolicies, appliedPolicyIds]
  );

  const linkSelectableOptions = useMemo((): LinkablePolicySelectableOption[] => {
    return linkablePolicies.map((policy) => {
      const policyTags = getLinkableTags(policy);
      return {
        key: policy.id,
        label: policy.name,
        policy,
        'data-test-subj': `linkedActionPoliciesLinkOption-${policy.id}`,
        append:
          policyTags.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {policyTags.map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : undefined,
      };
    });
  }, [linkablePolicies]);

  const popoverContentStyles = useMemo(
    () => css`
      width: ${euiTheme.base * 30}px;
    `,
    [euiTheme.base]
  );

  const popoverTitleStyles = useMemo(
    () => css`
      border-bottom: none;
    `,
    []
  );

  const searchPaddingStyles = useMemo(
    () => css`
      padding: 0 ${euiTheme.size.m} ${euiTheme.size.s};
    `,
    [euiTheme.size.m, euiTheme.size.s]
  );

  const addRuleTags = useCallback(
    (tagsToAdd: string[]) => {
      const next = Array.from(new Set([...ruleTags, ...tagsToAdd.filter(Boolean)]));
      setValue('metadata.tags', next, { shouldDirty: true });
    },
    [ruleTags, setValue]
  );

  const onCreateActionPolicy = useCallback(() => {
    closeLinkPopover();
    openCreateActionPolicyFlyout(
      (policy) => {
        if (policy.tags.length > 0) {
          addRuleTags(policy.tags);
        }
        void queryClient.invalidateQueries({ queryKey: ['matchedActionPolicies'] });
        void queryClient.invalidateQueries({ queryKey: ['findActionPolicies'] });
      },
      { variant: 'essential', ruleTags }
    );
  }, [addRuleTags, openCreateActionPolicyFlyout, queryClient, ruleTags]);

  const removeRuleTags = (tagsToRemove: string[]) => {
    if (tagsToRemove.length === 0) {
      return;
    }
    const removable = new Set(tagsToRemove);
    const currentTags = getValues('metadata.tags') ?? [];
    setValue(
      'metadata.tags',
      currentTags.filter((tag) => !removable.has(tag)),
      { shouldDirty: true }
    );
  };

  const selectPolicyToLink = useCallback(
    (policy: ActionPolicyResponse) => {
      closeLinkPopover();
      const policyTags = getLinkableTags(policy);
      if (policyTags.length > 0) {
        addRuleTags(policyTags);
      }
    },
    [addRuleTags]
  );

  const onLinkPolicySelectableChange = useCallback(
    (
      _nextOptions: LinkablePolicySelectableOption[],
      _event: EuiSelectableOnChangeEvent,
      changedOption?: LinkablePolicySelectableOption
    ) => {
      if (!changedOption?.policy) {
        return;
      }
      selectPolicyToLink(changedOption.policy);
    },
    [selectPolicyToLink]
  );

  const linkEmptyMessage = isLoadingLinkable
    ? i18n.translate(
        'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.linkSelectableLoading',
        { defaultMessage: 'Loading action policies…' }
      )
    : i18n.translate(
        'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.linkSelectableEmpty',
        {
          defaultMessage: 'No action policies to link.',
        }
      );

  return (
    <div data-test-subj="linkedActionPoliciesMatchingSection">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.title', {
            defaultMessage: 'Action policies',
          })}
        </h3>
      </EuiTitle>

      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate(
            'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.matchingSubtext',
            {
              defaultMessage:
                'Rule tags determine which action policies apply. Catch-all policies will match all alerts',
            }
          )}
        </p>
      </EuiText>

      <EuiSpacer size="m" />
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj="linkedActionPoliciesMatchCount"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.matchingLabel',
              { defaultMessage: 'Applied to this rule' }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="primary">{appliedPolicies.length}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {isLoading ? (
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="linkedActionPoliciesLoading"
        >
          {[0, 1].map((index) => (
            <EuiFlexItem key={index} grow={false}>
              <EuiSkeletonRectangle
                width="100%"
                height={40}
                borderRadius="m"
                contentAriaLabel={i18n.translate(
                  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.loadingCardAriaLabel',
                  { defaultMessage: 'Loading action policy' }
                )}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : (
        appliedPolicies.length > 0 && (
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            data-test-subj="linkedActionPoliciesAppliedCards"
          >
            {appliedPolicies.map((policy) => (
              <EuiFlexItem key={policy.id} grow={false}>
                <ActionPolicyCard
                  policy={policy}
                  isExpanded={expandedId === policy.id}
                  onToggle={() => setExpandedId(expandedId === policy.id ? null : policy.id)}
                  onRemoveMatchingTags={removeRuleTags}
                  ruleTags={ruleTags}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )
      )}

      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiPopover
            ownFocus
            isOpen={isLinkPopoverOpen}
            closePopover={closeLinkPopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            initialFocus="[data-test-subj='linkedActionPoliciesLinkSearch']"
            aria-labelledby={linkPopoverTitleId}
            panelProps={{
              css: css`
                overflow: hidden;
              `,
            }}
            button={
              <EuiButton
                size="s"
                color="text"
                iconType="link"
                onClick={() => setIsLinkPopoverOpen((open) => !open)}
                data-test-subj="linkedActionPoliciesLinkButton"
              >
                {i18n.translate(
                  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.addPolicyLabel',
                  { defaultMessage: 'Link action policy' }
                )}
              </EuiButton>
            }
          >
            <EuiPopoverTitle paddingSize="s" id={linkPopoverTitleId} css={popoverTitleStyles}>
              {i18n.translate(
                'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.linkPopoverTitle',
                { defaultMessage: 'Link action policy' }
              )}
            </EuiPopoverTitle>
            <div css={popoverContentStyles} data-test-subj="linkedActionPoliciesLinkPopover">
              <EuiSelectable<LinkablePolicySelectableOption>
                aria-label={i18n.translate(
                  'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.addPolicyAriaLabel',
                  { defaultMessage: 'Link action policy' }
                )}
                searchable
                singleSelection
                isLoading={isLoadingLinkable}
                options={linkSelectableOptions}
                onChange={onLinkPolicySelectableChange}
                searchProps={{
                  placeholder: i18n.translate(
                    'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.addPolicyPlaceholder',
                    { defaultMessage: 'Search for a policy to link' }
                  ),
                  compressed: true,
                  'data-test-subj': 'linkedActionPoliciesLinkSearch',
                }}
                emptyMessage={
                  <div data-test-subj="linkedActionPoliciesLinkEmpty">
                    <EuiText size="s" color="subdued" textAlign="center">
                      <p>{linkEmptyMessage}</p>
                    </EuiText>
                  </div>
                }
                noMatchesMessage={
                  <div data-test-subj="linkedActionPoliciesLinkNoMatches">
                    <EuiText size="s" color="subdued" textAlign="center">
                      <p>
                        {i18n.translate(
                          'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.linkSelectableNoMatches',
                          { defaultMessage: 'No action policies match your search.' }
                        )}
                      </p>
                    </EuiText>
                  </div>
                }
                listProps={{
                  paddingSize: 's',
                  isVirtualized: false,
                  rowHeight: 40,
                  showIcons: false,
                }}
                data-test-subj="linkedActionPoliciesOtherSelect"
              >
                {(list, search) => (
                  <>
                    <div css={searchPaddingStyles}>{search}</div>
                    <div
                      style={{ maxHeight: LINK_SELECTABLE_LIST_MAX_HEIGHT, overflowY: 'auto' }}
                      data-test-subj="linkedActionPoliciesLinkSelectableList"
                    >
                      {list}
                    </div>
                  </>
                )}
              </EuiSelectable>
            </div>
          </EuiPopover>
        </EuiFlexItem>
        {CreateActionPolicyFlyout && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="text"
              onClick={onCreateActionPolicy}
              data-test-subj="linkedActionPoliciesCreateFlyoutButton"
            >
              {i18n.translate(
                'xpack.responseOps.alertingV2RuleForm.linkedActionPolicies.createPolicyLabel',
                { defaultMessage: 'Create action policy' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
