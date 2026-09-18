/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SourceRuleData } from '@kbn/alerting-v2-episodes-ui/types/source_rule_data';
import { CoreStart, useService } from '@kbn/core-di-browser';
import moment from 'moment';
import {
  TagsOverflowBadgeRow,
  getTagsOverflowLimits,
} from '@kbn/alerting-v2-episodes-ui/components/actions/tags_overflow_badge_row';
import { EMPTY_VALUE } from '@kbn/alerting-v2-episodes-ui/constants';
import { TakeActionButton } from '../../action_policy/details_flyout/take_action_button';
import { RuleDetailsTable } from '../rule_details_table';

const FLYOUT_TITLE_ID = 'sourceRuleSummaryFlyoutTitle';

const extractGroupBy = (value: string | string[] | undefined): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) {
    const strings = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    return strings.length > 0 ? strings.join(', ') : undefined;
  }
  return undefined;
};

const { overflowSize: TAGS_OVERFLOW_SIZE, maxVisible: TAGS_MAX_VISIBLE_ON_OVERFLOW } =
  getTagsOverflowLimits(1);

interface DetailItem {
  title: string;
  description: string;
  'data-test-subj'?: string;
}

const buildConditionItems = (
  rule: SourceRuleData,
  ruleCategory: string | undefined
): DetailItem[] => {
  const { schedule, rule_type_id: ruleTypeId, params } = rule;
  const groupBy = extractGroupBy(params?.groupBy as string | string[] | undefined);

  const items: DetailItem[] = [];

  if (ruleCategory || ruleTypeId) {
    items.push({
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.ruleType', {
        defaultMessage: 'Rule type',
      }),
      description: ruleCategory ?? ruleTypeId ?? EMPTY_VALUE,
      'data-test-subj': 'sourceRuleType',
    });
  }

  if (groupBy) {
    items.push({
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.groupKey', {
        defaultMessage: 'Group key',
      }),
      description: groupBy,
      'data-test-subj': 'sourceRuleGroupKey',
    });
  }

  if (schedule?.interval) {
    items.push({
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.schedule', {
        defaultMessage: 'Schedule',
      }),
      description: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.scheduleValue', {
        defaultMessage: 'Every {interval}',
        values: { interval: schedule.interval },
      }),
      'data-test-subj': 'sourceRuleSchedule',
    });
  }

  return items;
};

const buildMetadataItems = (rule: SourceRuleData, dateFormat: string): DetailItem[] => {
  const formatDate = (date: string | undefined): string =>
    date ? moment(date).format(dateFormat) : EMPTY_VALUE;

  return [
    {
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: rule.created_by || EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.createdDate', {
        defaultMessage: 'Created date',
      }),
      description: formatDate(rule.created_at),
    },
    {
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.lastUpdate', {
        defaultMessage: 'Last update',
      }),
      description: formatDate(rule.updated_at),
    },
    {
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.updatedBy', {
        defaultMessage: 'Updated by',
      }),
      description: rule.updated_by || EMPTY_VALUE,
    },
  ];
};

export interface SourceRuleSummaryFlyoutProps {
  rule: SourceRuleData;
  ruleCategory?: string;
  ruleDetailsHref: string | null;
  onClose: () => void;
  type?: EuiFlyoutProps['type'];
}

export const SourceRuleSummaryFlyout = ({
  rule,
  ruleCategory,
  ruleDetailsHref,
  onClose,
  type = 'push',
}: SourceRuleSummaryFlyoutProps) => {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const toggleActions = useCallback(() => setIsActionsOpen((prev) => !prev), []);
  const closeActions = useCallback(() => setIsActionsOpen(false), []);

  const uiSettings = useService(CoreStart('uiSettings'));
  const dateFormat: string = uiSettings.get('dateFormat');

  const tags = rule.metadata?.tags ?? [];
  const { enabled } = rule;

  const statusBadge =
    enabled !== undefined ? (
      enabled ? (
        <EuiBadge color="success" data-test-subj="sourceRuleEnabledBadge">
          {i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.enabled', {
            defaultMessage: 'Enabled',
          })}
        </EuiBadge>
      ) : (
        <EuiBadge color="default" data-test-subj="sourceRuleDisabledBadge">
          {i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.disabled', {
            defaultMessage: 'Disabled',
          })}
        </EuiBadge>
      )
    ) : null;

  const conditionItems = buildConditionItems(rule, ruleCategory);
  const metadataItems = buildMetadataItems(rule, dateFormat);

  return (
    <EuiFlyout
      type={type}
      hasAnimation={false}
      size="s"
      ownFocus={false}
      hideCloseButton
      paddingSize="none"
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      data-test-subj="sourceRuleSummaryFlyout"
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
            <EuiToolTip
              content={i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.close', {
                defaultMessage: 'Close',
              })}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onClose}
                aria-label={i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.close', {
                  defaultMessage: 'Close',
                })}
                data-test-subj="sourceRuleSummaryFlyoutCloseButton"
              />
            </EuiToolTip>
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
            <h2 data-test-subj="sourceRuleSummaryFlyoutTitle">
              <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
                <EuiFlexItem grow={false}>
                  <span data-test-subj="sourceRuleName">{rule.metadata?.name ?? rule.id}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
                    {statusBadge ? <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem> : null}
                    <TagsOverflowBadgeRow
                      tags={tags}
                      overflowSize={TAGS_OVERFLOW_SIZE}
                      maxVisible={TAGS_MAX_VISIBLE_ON_OVERFLOW}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </h2>
          </EuiTitle>
        </EuiPanel>
        <EuiHorizontalRule margin="xs" />
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          {conditionItems.length > 0 ? (
            <>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate(
                    'xpack.alertingV2.sourceRuleSummaryFlyout.ruleConditionsSection',
                    {
                      defaultMessage: 'Rule conditions',
                    }
                  )}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <RuleDetailsTable items={conditionItems} />
              <EuiHorizontalRule />
            </>
          ) : null}
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.metadata', {
                defaultMessage: 'Metadata',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <RuleDetailsTable items={metadataItems} />
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
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                data-test-subj="sourceRuleSummaryFlyoutFooterCloseButton"
              >
                <FormattedMessage
                  id="xpack.alertingV2.sourceRuleSummaryFlyout.closeButton"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {ruleDetailsHref && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  isOpen={isActionsOpen}
                  closePopover={closeActions}
                  anchorPosition="upRight"
                  panelPaddingSize="none"
                  aria-label={i18n.translate(
                    'xpack.alertingV2.sourceRuleSummaryFlyout.takeActionAriaLabel',
                    { defaultMessage: 'Rule actions' }
                  )}
                  button={<TakeActionButton onClick={toggleActions} />}
                >
                  <EuiContextMenuPanel
                    items={[
                      <EuiContextMenuItem
                        key="viewDetails"
                        icon="eye"
                        href={ruleDetailsHref}
                        data-test-subj="sourceRuleSummaryFlyoutViewDetailsAction"
                      >
                        <FormattedMessage
                          id="xpack.alertingV2.sourceRuleSummaryFlyout.viewDetails"
                          defaultMessage="View details"
                        />
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
