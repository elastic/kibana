/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import type { RuleApiResponse } from '../../services/rules_api';

export interface RuleDetailPageProps {
  rule: RuleApiResponse;
}

const EMPTY_VALUE = '-';

const formatEvery = (duration: string | undefined) => {
  if (!duration) {
    return EMPTY_VALUE;
  }

  return i18n.translate('xpack.alertingV2.ruleDetails.every', {
    defaultMessage: '{duration}',
    values: { duration: formatDuration(duration) },
  });
};

const formatMaybeDuration = (duration: string | undefined) => {
  if (!duration) {
    return EMPTY_VALUE;
  }

  return formatDuration(duration);
};

const formatMaybeString = (value: string | undefined | null) => {
  if (!value) {
    return EMPTY_VALUE;
  }

  return value;
};

const formatMaybeList = (value: string[] | undefined) => {
  if (!value || value.length === 0) {
    return EMPTY_VALUE;
  }

  return value.join(', ');
};

const formatMaybeIsoDateTime = (value: string | undefined) => {
  if (!value) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE;
  }

  const datePart = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return i18n.translate('xpack.alertingV2.ruleDetails.dateTime', {
    defaultMessage: '{date} at {time}',
    values: { date: datePart, time: timePart },
  });
};

export const RuleDetailPage: React.FunctionComponent<RuleDetailPageProps> = ({ rule }) => {
  const configurationListItems = useMemo(
    () => [
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.runsEvery', {
          defaultMessage: 'Runs every',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsSchedule"
            itemValue={formatEvery(rule.schedule.every)}
          />
        ),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.lookback', {
          defaultMessage: 'Lookback',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsLookback"
            itemValue={formatMaybeDuration(rule.schedule.lookback)}
          />
        ),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.timeField', {
          defaultMessage: 'Time field',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsTimeField"
            itemValue={formatMaybeString(rule.time_field)}
          />
        ),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.groupBy', {
          defaultMessage: 'Group by',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsGroupBy"
            itemValue={formatMaybeList(rule.grouping?.fields)}
          />
        ),
      },
    ],
    [rule.schedule, rule.time_field, rule.grouping?.fields]
  );

  const metadataListItems = useMemo(
    () => [
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.created', {
          defaultMessage: 'Created',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsCreatedAt"
            itemValue={formatMaybeIsoDateTime(rule.createdAt)}
          />
        ),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.lastModified', {
          defaultMessage: 'Last modified',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsUpdatedAt"
            itemValue={formatMaybeIsoDateTime(rule.updatedAt)}
          />
        ),
      },
      {
        title: i18n.translate('xpack.alertingV2.ruleDetails.createdBy', {
          defaultMessage: 'Created by',
        }),
        description: (
          <ItemValueRuleSummary
            data-test-subj="alertingV2RuleDetailsCreatedBy"
            itemValue={formatMaybeString(rule.createdBy)}
          />
        ),
      },
    ],
    [rule.createdAt, rule.updatedAt, rule.createdBy]
  );

  return (
    <>
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={
          <span data-test-subj="ruleName">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleDetailsTitle"
              defaultMessage="{ruleName}"
              values={{ ruleName: rule.metadata.name }}
            />
          </span>
        }
        description={
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="m"
            wrap={false}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  {rule.enabled ? (
                    <EuiBadge color="success" data-test-subj="enabledBadge">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.enabled"
                        defaultMessage="Enabled"
                      />
                    </EuiBadge>
                  ) : (
                    <EuiBadge color="subdued" data-test-subj="disabledBadge">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.disabled"
                        defaultMessage="Disabled"
                      />
                    </EuiBadge>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="ruleType">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.kindLabel"
                      defaultMessage="Kind"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj="kindBadge">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.kindValue"
                      defaultMessage="{ruleType}"
                      values={{ ruleType: rule.kind }}
                    />
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="ruleTags">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.tagsLabel"
                      defaultMessage="Tags"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {rule.metadata.labels && (
                    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj="ruleTags">
                      {rule.metadata.labels.map((label) => (
                        <EuiFlexItem key={label} grow={false}>
                          <EuiBadge color="hollow">{label}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />

      <EuiSpacer size="m" />
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={2}>
          <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
            <EuiTitle size="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.triggersActionsUI.ruleDetails.definition', {
                  defaultMessage: 'Configuration',
                })}
              </EuiFlexItem>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              compressed={true}
              type="column"
              listItems={configurationListItems}
              css={{ alignItems: 'start' }}
            />

            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.alertingV2.ruleDetails.query', {
                  defaultMessage: 'ES|QL query',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder paddingSize="none" css={{ width: '100%' }}>
              <EuiCodeBlock
                language="text"
                isCopyable
                overflowHeight={360}
                paddingSize="m"
                data-test-subj="alertingV2RuleDetailsQuery"
                css={{ width: '100%' }}
              >
                {rule.evaluation?.query?.base || EMPTY_VALUE}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.alertingV2.ruleDetails.metadata', {
                  defaultMessage: 'Metadata',
                })}
              </EuiFlexItem>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              compressed={true}
              type="column"
              listItems={metadataListItems}
              css={{ alignItems: 'start', gridTemplateColumns: '140px 1fr' }}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
    </>
  );
};

export interface ItemValueRuleSummaryProps {
  itemValue: string;
  extraSpace?: boolean;
}

function ItemValueRuleSummary({
  itemValue,
  extraSpace = true,
  ...otherProps
}: ItemValueRuleSummaryProps) {
  return (
    <EuiFlexItem grow={extraSpace ? 3 : 1} {...otherProps}>
      <EuiText size="s">{itemValue}</EuiText>
    </EuiFlexItem>
  );
}
