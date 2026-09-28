/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React, { useState } from 'react';
import { useBulkGetUserProfiles } from '../../../hooks/use_bulk_get_user_profiles';
import { useIsActionPoliciesLicenseValid } from '../../../hooks/use_is_action_policies_license_valid';
import { collectActorUids, resolveDisplayName } from '../../../utils/resolve_display_name';
import { ActionPolicyActionsMenu } from '../action_policy_actions_menu';
import { BadgeList } from '../badge_list';
import { isSnoozed } from '../is_snoozed';
import {
  ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE,
  DISPATCH_PER_LABEL,
  FREQUENCY_LABEL,
  GROUP_BY_LABEL,
  getFrequencyLabel,
  getGroupingModeLabel,
} from '../labels';
import { DestinationCard } from './destination_card';
import { Column, SubsectionColumns } from './subsection_columns';

const TAKE_ACTION_BUTTON_ID = 'actionPolicyDetailsFlyoutTakeAction';
const EMPTY_VALUE = '-';

interface Props {
  policy: ActionPolicyResponse;
  canWrite: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  onUpdateApiKey: (id: string) => void;
  isStateLoading?: boolean;
  isSnoozeLoading?: boolean;
  session?: EuiFlyoutProps['session'];
  ownFocus?: EuiFlyoutProps['ownFocus'];
}

const { Header, Body, Footer } = FlyoutTemplate;
const { Badge, InfoBlock } = Header;

export const ActionPolicyDetailsFlyout = ({
  policy,
  canWrite,
  onClose,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  onSnooze,
  onCancelSnooze,
  onUpdateApiKey,
  isStateLoading = false,
  isSnoozeLoading = false,
  session = 'never',
  ownFocus = false,
}: Props) => {
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateTimeFormat);

  const metadataUids = collectActorUids([policy.created_by, policy.updated_by]);

  const { data: profileByUid } = useBulkGetUserProfiles({ uids: metadataUids });

  const { snoozed_until: snoozedUntil, grouping_mode: groupingMode, group_by: groupBy } = policy;
  const snoozedActive = isSnoozed(snoozedUntil);
  const isLicenseValid = useIsActionPoliciesLicenseValid();
  const isEnableBlockedByLicense = !policy.enabled && !isLicenseValid;

  const [isTakeActionOpen, setIsTakeActionOpen] = useState(false);

  const matcherTags = policy.matcher?.tags?.length ? policy.matcher.tags : null;
  const matcherExpression = policy.matcher?.expression?.trim() || null;

  const policyScopeSummary =
    matcherTags && matcherExpression
      ? i18n.translate(
          'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.tagsAndExpression',
          {
            defaultMessage:
              'This policy matches all alerts from rules with one of the following tags AND the matching query.',
          }
        )
      : matcherTags
      ? i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.tags', {
          defaultMessage:
            'This policy matches all alerts from rules with one of the following tags.',
        })
      : matcherExpression
      ? i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.expression', {
          defaultMessage: 'This policy matches all alerts matching this query.',
        })
      : i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.matchesAll', {
          defaultMessage: 'This policy matches all alerts.',
        });

  return (
    <>
      <FlyoutTemplate
        type="overlay"
        size="m"
        resizable
        ownFocus={ownFocus}
        session={session}
        onClose={onClose}
        closeButtonProps={{ 'data-test-subj': 'detailsFlyoutCloseIcon' }}
        data-test-subj="actionPolicyDetailsFlyout"
      >
        <Header title={policy.name}>
          <Badge
            color={policy.enabled ? 'success' : 'default'}
            data-test-subj={
              policy.enabled
                ? 'actionPolicyDetailsFlyoutEnabledBadge'
                : 'actionPolicyDetailsFlyoutDisabledBadge'
            }
          >
            {policy.enabled
              ? i18n.translate('xpack.alertingV2.actionPolicy.stateBadge.enabled', {
                  defaultMessage: 'Enabled',
                })
              : i18n.translate('xpack.alertingV2.actionPolicy.stateBadge.disabled', {
                  defaultMessage: 'Disabled',
                })}
          </Badge>
          {snoozedActive && (
            <Badge
              color="accent"
              iconType="bellSlash"
              data-test-subj="actionPolicyDetailsFlyoutSnoozedBadge"
            >
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.detailsFlyout.snoozedUntil"
                defaultMessage="Snoozed until {date}"
                values={{ date: formatDate(snoozedUntil!) }}
              />
            </Badge>
          )}

          <InfoBlock
            title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.header.enabled', {
              defaultMessage: 'Enabled',
            })}
            data-test-subj="actionPolicyDetailsFlyoutEnabledBlock"
          >
            {isStateLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <EuiSwitch
                compressed
                showLabel={false}
                checked={policy.enabled}
                disabled={!canWrite || isEnableBlockedByLicense}
                title={
                  isEnableBlockedByLicense ? ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE : undefined
                }
                label={
                  policy.enabled
                    ? i18n.translate('xpack.alertingV2.actionPolicy.stateBadge.enabled', {
                        defaultMessage: 'Enabled',
                      })
                    : i18n.translate('xpack.alertingV2.actionPolicy.stateBadge.disabled', {
                        defaultMessage: 'Disabled',
                      })
                }
                onChange={() => {
                  if (policy.enabled) {
                    onDisable(policy.id);
                  } else {
                    onEnable(policy.id);
                  }
                }}
                data-test-subj="actionPolicyDetailsFlyoutEnabledSwitch"
              />
            )}
          </InfoBlock>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.header.createdBy', {
              defaultMessage: 'Created by',
            })}
            data-test-subj="actionPolicyDetailsFlyoutCreatedByBlock"
          >
            {resolveDisplayName(policy.created_by, profileByUid, EMPTY_VALUE)}
          </InfoBlock>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.header.updatedBy', {
              defaultMessage: 'Updated by',
            })}
            data-test-subj="actionPolicyDetailsFlyoutUpdatedByBlock"
          >
            {resolveDisplayName(policy.updated_by, profileByUid, EMPTY_VALUE)}
          </InfoBlock>
          <InfoBlock
            title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.header.updatedOn', {
              defaultMessage: 'Updated on',
            })}
            data-test-subj="actionPolicyDetailsFlyoutUpdatedOnBlock"
          >
            {formatDate(policy.updated_at)}
          </InfoBlock>
        </Header>

        <Body>
          <Body.Section
            id="definition"
            title={i18n.translate(
              'xpack.alertingV2.actionPolicy.detailsFlyout.actionPolicy.title',
              { defaultMessage: 'Definition' }
            )}
            hasBorder
            data-test-subj="actionPolicyDetailsFlyoutDefinition"
          >
            <Body.Section.Subsection
              title={i18n.translate(
                'xpack.alertingV2.actionPolicy.detailsFlyout.description.label',
                { defaultMessage: 'Description' }
              )}
              data-test-subj="actionPolicyDetailsFlyoutDescriptionBlock"
            >
              <EuiText size="s">{policy.description || EMPTY_VALUE}</EuiText>
            </Body.Section.Subsection>
            <Body.Section.Subsection
              title={i18n.translate(
                'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.label',
                { defaultMessage: 'Policy scope' }
              )}
              data-test-subj="actionPolicyDetailsFlyoutPolicyScopeBlock"
            >
              <EuiText size="s">{policyScopeSummary}</EuiText>
              {matcherTags && (
                <>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {i18n.translate(
                          'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.ruleTags',
                          { defaultMessage: 'Rule tags:' }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    {matcherTags.map((tag) => (
                      <EuiFlexItem grow={false} key={tag}>
                        <EuiBadge color="hollow">{tag}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </>
              )}
              {matcherExpression && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    {i18n.translate(
                      'xpack.alertingV2.actionPolicy.detailsFlyout.policyScope.advancedQuery',
                      { defaultMessage: 'Advanced matching query:' }
                    )}{' '}
                    <EuiCode>{matcherExpression}</EuiCode>
                  </EuiText>
                </>
              )}
            </Body.Section.Subsection>
          </Body.Section>
          <Body.Section
            id="notification"
            title={i18n.translate(
              'xpack.alertingV2.actionPolicy.detailsFlyout.notification.title',
              { defaultMessage: 'Notification' }
            )}
            data-test-subj="actionPolicyDetailsFlyoutNotification"
          >
            <SubsectionColumns hasBorder>
              <Column
                title={DISPATCH_PER_LABEL}
                data-test-subj="actionPolicyDetailsFlyoutDispatchModeBlock"
              >
                {getGroupingModeLabel(groupingMode)}
              </Column>
              {groupingMode === 'per_field' && (
                <Column
                  title={GROUP_BY_LABEL}
                  data-test-subj="actionPolicyDetailsFlyoutGroupByBlock"
                >
                  {groupBy && groupBy.length > 0 ? <BadgeList items={groupBy} /> : EMPTY_VALUE}
                </Column>
              )}
              <Column
                title={FREQUENCY_LABEL}
                data-test-subj="actionPolicyDetailsFlyoutFrequencyBlock"
              >
                {getFrequencyLabel(policy.throttle, groupingMode)}
              </Column>
            </SubsectionColumns>
          </Body.Section>
          <Body.Section
            id="destinations"
            title={i18n.translate(
              'xpack.alertingV2.actionPolicy.detailsFlyout.destinations.title',
              { defaultMessage: 'Destinations' }
            )}
            data-test-subj="actionPolicyDetailsFlyoutDestinations"
          >
            {policy.destinations.length === 0 ? (
              <EuiText size="s" color="subdued">
                <p>-</p>
              </EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                {policy.destinations.map((destination) => (
                  <EuiFlexItem key={`${destination.type}-${destination.id}`}>
                    <DestinationCard destination={destination} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </Body.Section>
        </Body>

        <Footer>
          {canWrite && (
            <Footer.PrimaryAction
              id={TAKE_ACTION_BUTTON_ID}
              label={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.takeAction', {
                defaultMessage: 'Take action',
              })}
              iconType="chevronSingleDown"
              onClick={() => setIsTakeActionOpen((open) => !open)}
              data-test-subj="detailsFlyoutTakeActionButton"
            />
          )}
        </Footer>
      </FlyoutTemplate>
      {canWrite && (
        <ActionPolicyActionsMenu
          policy={policy}
          anchorId={TAKE_ACTION_BUTTON_ID}
          isOpen={isTakeActionOpen}
          onOpenChange={setIsTakeActionOpen}
          anchorPosition="upRight"
          onEdit={(id) => {
            onClose();
            onEdit(id);
          }}
          onClone={onClone}
          onDelete={onDelete}
          onEnable={onEnable}
          onDisable={onDisable}
          onSnooze={onSnooze}
          onCancelSnooze={onCancelSnooze}
          onUpdateApiKey={onUpdateApiKey}
          isStateLoading={isStateLoading}
          isSnoozeLoading={isSnoozeLoading}
        />
      )}
    </>
  );
};
