/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { FlyoutTemplate } from '@kbn/flyout-template';
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import moment from 'moment';
import { EMPTY_VALUE } from '../../../utils/rule_display';
import { RuleDetailsTable } from '../rule_details_table';
import {
  DISABLED_TAKE_ACTION_PANELS,
  RULE_SUMMARY_FLYOUT_TITLE,
  RuleSummaryLoadingBody,
  RuleSummaryNotFoundBody,
} from './rule_summary_state_bodies';

interface DetailItem {
  title: string;
  description: string;
  'data-test-subj'?: string;
}

const buildConditionItems = (
  rule: RuleResponse,
  ruleCategory: string | undefined
): DetailItem[] => {
  const groupByFields = rule.grouping?.fields;
  const scheduleEvery = rule.schedule?.every;

  const items: DetailItem[] = [];

  if (ruleCategory) {
    items.push({
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.ruleType', {
        defaultMessage: 'Rule type',
      }),
      description: ruleCategory,
      'data-test-subj': 'sourceRuleType',
    });
  }

  if (groupByFields && groupByFields.length > 0) {
    items.push({
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.groupKey', {
        defaultMessage: 'Group key',
      }),
      description: groupByFields.join(', '),
      'data-test-subj': 'sourceRuleGroupKey',
    });
  }

  if (scheduleEvery) {
    items.push({
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.schedule', {
        defaultMessage: 'Schedule',
      }),
      description: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.scheduleValue', {
        defaultMessage: 'Every {interval}',
        values: { interval: scheduleEvery },
      }),
      'data-test-subj': 'sourceRuleSchedule',
    });
  }

  return items;
};

const buildMetadataItems = (rule: RuleResponse, dateFormat: string): DetailItem[] => {
  const formatDate = (date: string | undefined): string =>
    date ? moment(date).format(dateFormat) : EMPTY_VALUE;

  return [
    {
      title: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: rule.created_by?.profile_uid || EMPTY_VALUE,
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
      description: rule.updated_by?.profile_uid || EMPTY_VALUE,
    },
  ];
};

export interface SourceRuleSummaryFlyoutProps {
  /** Unset while loading, or when no rule is available (missing, or failed to load with no cached copy). */
  rule?: RuleResponse;
  isLoading?: boolean;
  ruleCategory?: string;
  ruleDetailsHref: string | null;
  onClose: () => void;
}

const { Header, Body, Footer } = FlyoutTemplate;
const { Badge } = Header;

export const SourceRuleSummaryFlyout = ({
  rule,
  isLoading = false,
  ruleCategory,
  ruleDetailsHref,
  onClose,
}: SourceRuleSummaryFlyoutProps) => {
  const uiSettings = useService(CoreStart('uiSettings'));
  const dateFormat: string = uiSettings.get('dateFormat');

  const ruleName = rule ? rule.metadata?.name ?? rule.id : RULE_SUMMARY_FLYOUT_TITLE;
  const tags = rule?.metadata?.tags ?? [];
  const conditionItems = rule ? buildConditionItems(rule, ruleCategory) : [];
  const metadataItems = rule ? buildMetadataItems(rule, dateFormat) : [];

  const getTakeActionPanels = (): FlyoutFooterMenuPanel[] => {
    if (!ruleDetailsHref) {
      return [];
    }
    if (!rule) {
      return DISABLED_TAKE_ACTION_PANELS;
    }
    return [
      {
        id: 0,
        items: [
          {
            key: 'viewDetails',
            name: i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.viewDetails', {
              defaultMessage: 'View details',
            }),
            icon: 'eye',
            href: ruleDetailsHref,
            'data-test-subj': 'sourceRuleSummaryFlyoutViewDetailsAction',
          },
        ],
      },
    ];
  };

  const renderBody = () => {
    if (isLoading) {
      return <RuleSummaryLoadingBody />;
    }
    if (!rule) {
      return <RuleSummaryNotFoundBody />;
    }
    return (
      <>
        {conditionItems.length > 0 && (
          <Body.Section
            id="conditions"
            title={i18n.translate(
              'xpack.alertingV2.sourceRuleSummaryFlyout.ruleConditionsSection',
              {
                defaultMessage: 'Rule conditions',
              }
            )}
          >
            <RuleDetailsTable items={conditionItems} />
          </Body.Section>
        )}
        <Body.Section
          id="metadata"
          title={i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.metadata', {
            defaultMessage: 'Metadata',
          })}
        >
          <RuleDetailsTable items={metadataItems} />
        </Body.Section>
      </>
    );
  };

  return (
    <FlyoutTemplate
      type="overlay"
      size="m"
      resizable
      ownFocus={false}
      session="start"
      onClose={onClose}
      flyoutMenuProps={{ title: RULE_SUMMARY_FLYOUT_TITLE }}
      data-test-subj="sourceRuleSummaryFlyout"
    >
      <Header
        title={<span data-test-subj="sourceRuleName">{ruleName}</span>}
        titleText={ruleName}
        isLoading={isLoading}
      >
        {rule && (
          <>
            <Badge color="hollow" data-test-subj="classicRulesBadge">
              {i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.classicRulesBadge', {
                defaultMessage: 'Classic',
              })}
            </Badge>
            {rule.enabled !== undefined && (
              <Badge
                color={rule.enabled ? 'success' : 'default'}
                data-test-subj={rule.enabled ? 'sourceRuleEnabledBadge' : 'sourceRuleDisabledBadge'}
              >
                {rule.enabled
                  ? i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.enabled', {
                      defaultMessage: 'Enabled',
                    })
                  : i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.disabled', {
                      defaultMessage: 'Disabled',
                    })}
              </Badge>
            )}
            {tags.map((tag) => (
              <Badge key={tag} color="hollow">
                {tag}
              </Badge>
            ))}
          </>
        )}
      </Header>

      <Body>{renderBody()}</Body>

      <Footer>
        <Footer.SecondaryAction
          label={i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.closeButton', {
            defaultMessage: 'Close',
          })}
          onClick={onClose}
          data-test-subj="sourceRuleSummaryFlyoutFooterCloseButton"
        />
        <Footer.PrimaryActionMenu
          label={i18n.translate('xpack.alertingV2.sourceRuleSummaryFlyout.takeAction', {
            defaultMessage: 'Take action',
          })}
          aria-label={i18n.translate(
            'xpack.alertingV2.sourceRuleSummaryFlyout.takeActionAriaLabel',
            {
              defaultMessage: 'Rule actions',
            }
          )}
          panels={getTakeActionPanels()}
          isDisabled={!rule}
          data-test-subj="sourceRuleSummaryFlyoutTakeActionButton"
        />
      </Footer>
    </FlyoutTemplate>
  );
};
