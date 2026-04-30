/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiDescriptionListProps,
} from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React from 'react';
import { ActionPolicyActionsMenu } from '../action_policy_actions_menu';
import { ActionPolicyStateBadge } from '../action_policy_state_badge';
import { isSnoozed } from '../is_snoozed';
import { getGroupingModeLabel, getThrottleStrategyLabel } from '../labels';
import { BadgeList } from './badge_list';
import { DestinationRow } from './destination_row';

const FLYOUT_TITLE_ID = 'actionPolicyDetailsFlyoutTitle';
const EMPTY_VALUE = '-';

interface Props {
  policy: ActionPolicyResponse;
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
}

export const ActionPolicyDetailsFlyout = ({
  policy,
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
}: Props) => {
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateTimeFormat);

  const snoozedActive = isSnoozed(policy.snoozedUntil);

  const handleEdit = () => {
    onClose();
    onEdit(policy.id);
  };

  const handleClone = (p: ActionPolicyResponse) => {
    onClose();
    onClone(p);
  };

  const handleDelete = (p: ActionPolicyResponse) => {
    onClose();
    onDelete(p);
  };

  const handleUpdateApiKey = (id: string) => {
    onClose();
    onUpdateApiKey(id);
  };

  const actionPolicyItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.description', {
        defaultMessage: 'Description',
      }),
      description: policy.description ? policy.description : EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.tags', {
        defaultMessage: 'Tags',
      }),
      description:
        policy.tags && policy.tags.length > 0 ? <BadgeList items={policy.tags} /> : EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.matcher', {
        defaultMessage: 'Matcher',
      }),
      description: policy.matcher ? (
        <EuiCode>{policy.matcher}</EuiCode>
      ) : (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.actionPolicy.detailsFlyout.matchesAll"
            defaultMessage="Matches all alerts."
          />
        </EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.dispatchMode', {
        defaultMessage: 'Dispatch per',
      }),
      description: getGroupingModeLabel(policy.groupingMode),
    },
  ];
  if (policy.groupingMode === 'per_field' && policy.groupBy && policy.groupBy.length > 0) {
    actionPolicyItems.push({
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.groupBy', {
        defaultMessage: 'Group by',
      }),
      description: <BadgeList items={policy.groupBy} />,
    });
  }
  actionPolicyItems.push({
    title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.frequency', {
      defaultMessage: 'Frequency',
    }),
    description: (
      <>
        {getThrottleStrategyLabel(policy.throttle?.strategy, policy.groupingMode)}
        {policy.throttle?.interval && (
          <>
            {' '}
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.detailsFlyout.interval"
                defaultMessage="Every {interval}"
                values={{ interval: policy.throttle.interval }}
              />
            </EuiText>
          </>
        )}
      </>
    ),
  });
  actionPolicyItems.push({
    title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.destinations', {
      defaultMessage: 'Destinations',
    }),
    description:
      policy.destinations.length === 0 ? (
        EMPTY_VALUE
      ) : (
        <EuiFlexGroup direction="column" gutterSize="xs">
          {policy.destinations.map((destination) => (
            <EuiFlexItem key={`${destination.type}-${destination.id}`}>
              <DestinationRow destination={destination} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
  });

  const metadataItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.metadata.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: policy.createdByUsername ?? EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.metadata.createdAt', {
        defaultMessage: 'Created at',
      }),
      description: formatDate(policy.createdAt),
    },
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.metadata.updatedBy', {
        defaultMessage: 'Updated by',
      }),
      description: policy.updatedByUsername ?? EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.metadata.updatedAt', {
        defaultMessage: 'Updated at',
      }),
      description: formatDate(policy.updatedAt),
    },
  ];

  return (
    <EuiFlyout
      type="push"
      hasAnimation
      size="s"
      ownFocus
      hideCloseButton
      paddingSize="none"
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="actionPolicyDetailsFlyout"
    >
      <EuiPanel
        paddingSize="xs"
        hasShadow={false}
        hasBorder={false}
        borderRadius="none"
        color="transparent"
      >
        <EuiFlexGroup
          justifyContent="flexEnd"
          gutterSize="s"
          responsive={false}
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <ActionPolicyActionsMenu
              policy={policy}
              onClone={handleClone}
              onDelete={handleDelete}
              onEnable={onEnable}
              onDisable={onDisable}
              onSnooze={onSnooze}
              onCancelSnooze={onCancelSnooze}
              onUpdateApiKey={handleUpdateApiKey}
              isStateLoading={isStateLoading}
              data-test-subj="detailsFlyoutActionsMenuButton"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={onClose}
              aria-label={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.closeIcon', {
                defaultMessage: 'Close',
              })}
              data-test-subj="detailsFlyoutCloseIcon"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiFlyoutBody>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
            <h2 data-test-subj="actionPolicyDetailsFlyoutTitle">{policy.name}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <ActionPolicyStateBadge policy={policy} isLoading={false} />
            </EuiFlexItem>
            {snoozedActive && policy.snoozedUntil && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="accent" iconType="bellSlash">
                  <FormattedMessage
                    id="xpack.alertingV2.actionPolicy.detailsFlyout.snoozedUntil"
                    defaultMessage="Snoozed until {date}"
                    values={{ date: formatDate(policy.snoozedUntil) }}
                  />
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
        <EuiHorizontalRule margin="xs" />
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.detailsFlyout.actionPolicy.title"
                defaultMessage="Definition"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList compressed type="column" listItems={actionPolicyItems} />
          <EuiHorizontalRule />
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.alertingV2.actionPolicy.detailsFlyout.metadata.title"
                defaultMessage="Metadata"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList compressed type="column" listItems={metadataItems} />
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                data-test-subj="detailsFlyoutCloseButton"
                iconType="cross"
              >
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.detailsFlyout.close"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="pencil"
                onClick={handleEdit}
                data-test-subj="detailsFlyoutEditButton"
                aria-label={i18n.translate(
                  'xpack.alertingV2.actionPolicy.detailsFlyout.edit.ariaLabel',
                  { defaultMessage: 'Edit this action policy' }
                )}
              >
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.detailsFlyout.edit"
                  defaultMessage="Edit"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
