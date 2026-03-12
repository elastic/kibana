/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { RuleApiResponse } from '../../services/rules_api';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { RulesDeleteModalConfirmation } from '../common/rules_delete_modal_confirmation';
import { RuleHeaderDescription, RuleTitleWithBadges } from './rule_header_description';
import { ItemValueRuleSummary } from './item_value_rule_summary';

export interface RuleDetailPageProps {
  rule: RuleApiResponse;
}

const EMPTY_VALUE = '-';

const MODE_LABELS: Record<string, string> = {
  signal: i18n.translate('xpack.alertingV2.ruleDetails.modeSignal', {
    defaultMessage: 'Detect only',
  }),
  alert: i18n.translate('xpack.alertingV2.ruleDetails.modeAlert', {
    defaultMessage: 'Alert',
  }),
};

const RECOVERY_TYPE_LABELS: Record<string, string> = {
  query: i18n.translate('xpack.alertingV2.ruleDetails.recoveryTypeQuery', {
    defaultMessage: 'ESQL recovery query',
  }),
  no_breach: i18n.translate('xpack.alertingV2.ruleDetails.recoveryTypeNoBreach', {
    defaultMessage: 'No breach',
  }),
};

const NO_DATA_BEHAVIOR_LABELS: Record<string, string> = {
  no_data: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehaviorNoData', {
    defaultMessage: 'No data',
  }),
  last_status: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehaviorLastStatus', {
    defaultMessage: 'Keep last status',
  }),
  recover: i18n.translate('xpack.alertingV2.ruleDetails.noDataBehaviorRecover', {
    defaultMessage: 'Recover',
  }),
};

function formatAlertDelay(stateTransition: RuleApiResponse['state_transition']): string {
  if (!stateTransition?.pending_count) return EMPTY_VALUE;
  return i18n.translate('xpack.alertingV2.ruleDetails.alertDelayValue', {
    defaultMessage: 'After {count} {count, plural, one {match} other {matches}}',
    values: { count: stateTransition.pending_count },
  });
}

function renderRecoveryDescription(
  recoveryPolicy: RuleApiResponse['recovery_policy']
): NonNullable<React.ReactNode> {
  if (!recoveryPolicy) return EMPTY_VALUE;

  const typeLabel = RECOVERY_TYPE_LABELS[recoveryPolicy.type] ?? recoveryPolicy.type;
  const hasQuery =
    recoveryPolicy.type === 'query' &&
    (recoveryPolicy.query?.base || recoveryPolicy.query?.condition);

  if (!hasQuery) {
    return typeLabel;
  }

  const queryText = [recoveryPolicy.query?.base, recoveryPolicy.query?.condition]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      <EuiText size="s">{typeLabel}</EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock
        language="esql"
        isCopyable
        paddingSize="m"
        data-test-subj="alertingV2RuleDetailsRecoveryQuery"
      >
        {queryText}
      </EuiCodeBlock>
    </>
  );
}

export const RuleDetailPage: React.FunctionComponent<RuleDetailPageProps> = ({ rule }) => {
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });

  const history = useHistory();
  const uiSettings = useService(CoreStart('uiSettings'));
  const { mutate: deleteRule } = useDeleteRule();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  const dateFormat = uiSettings.get('dateFormat');
  const formatDate = (value: string) => moment(value).format(dateFormat);

  const showDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(true);
  };

  const handleRuleDelete = async () => {
    setShowDeleteConfirmation(false);
    deleteRule(rule.id, {
      onSuccess: () => {
        history.push('/');
      },
    });
  };

  const isAlertMode = rule.kind === 'alert';

  const dataSource = getIndexPatternFromESQLQuery(rule.evaluation?.query?.base) || EMPTY_VALUE;

  const conditionItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.dataSource', {
        defaultMessage: 'Data source',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsDataSource"
          itemValue={dataSource}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.groupKey', {
        defaultMessage: 'Group key',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsGroupBy"
          itemValue={rule.grouping?.fields?.length ? rule.grouping.fields.join(', ') : EMPTY_VALUE}
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
          itemValue={rule.time_field ?? EMPTY_VALUE}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.schedule', {
        defaultMessage: 'Schedule',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsSchedule"
          itemValue={i18n.translate('xpack.alertingV2.ruleDetails.scheduleValue', {
            defaultMessage: 'Every {interval}',
            values: { interval: formatDuration(rule.schedule.every) },
          })}
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
          itemValue={rule.schedule.lookback ? formatDuration(rule.schedule.lookback) : EMPTY_VALUE}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.mode', {
        defaultMessage: 'Mode',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsMode"
          itemValue={MODE_LABELS[rule.kind] ?? rule.kind}
        />
      ),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.recovery', {
        defaultMessage: 'Recovery',
      }),
      description: renderRecoveryDescription(rule.recovery_policy),
    },
    ...(isAlertMode
      ? [
          {
            title: i18n.translate('xpack.alertingV2.ruleDetails.alertDelay', {
              defaultMessage: 'Alert delay',
            }),
            description: (
              <ItemValueRuleSummary
                data-test-subj="alertingV2RuleDetailsAlertDelay"
                itemValue={formatAlertDelay(rule.state_transition)}
              />
            ),
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.noDataConfig', {
        defaultMessage: 'No data config',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsNoDataConfig"
          itemValue={
            rule.no_data?.behavior
              ? NO_DATA_BEHAVIOR_LABELS[rule.no_data.behavior] ?? rule.no_data.behavior
              : EMPTY_VALUE
          }
        />
      ),
    },
  ];

  const metadataItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdBy', {
        defaultMessage: 'Created by',
      }),
      description: rule.createdBy ?? EMPTY_VALUE,
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.createdDate', {
        defaultMessage: 'Created date',
      }),
      description: formatDate(rule.createdAt),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.lastUpdate', {
        defaultMessage: 'Last update',
      }),
      description: formatDate(rule.updatedAt),
    },
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.updatedBy', {
        defaultMessage: 'Updated by',
      }),
      description: rule.updatedBy ?? EMPTY_VALUE,
    },
  ];

  return (
    <>
      {showDeleteConfirmation && (
        <RulesDeleteModalConfirmation
          onConfirm={handleRuleDelete}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={<RuleTitleWithBadges rule={rule} />}
        description={<RuleHeaderDescription rule={rule} />}
        rightSideItems={[
          <RuleDetailsActionsMenu
            key="actions"
            rule={rule}
            showDeleteConfirmation={showDeleteConfirmationModal}
          />,
          <EuiButtonEmpty
            aria-label={i18n.translate(
              'xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel',
              { defaultMessage: 'Edit Rule' }
            )}
            data-test-subj="openEditRuleFlyoutButton"
            iconType="pencil"
            name="edit"
            onClick={() => {
              history.push(`/edit/${rule.id}`);
            }}
          >
            <FormattedMessage
              id="xpack.alertingV2.sections.ruleDetails.editRuleButtonLabel"
              defaultMessage="Edit Rule"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.alertingV2.ruleDetails.ruleConditions', {
            defaultMessage: 'Rule conditions',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.alertingV2.ruleDetails.baseQuery', {
            defaultMessage: 'Base query',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="esql"
        isCopyable
        overflowHeight={360}
        paddingSize="m"
        data-test-subj="alertingV2RuleDetailsBaseQuery"
      >
        {rule.evaluation?.query?.base || EMPTY_VALUE}
      </EuiCodeBlock>

      {isAlertMode && rule.evaluation?.query?.condition && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.alertingV2.ruleDetails.alertCondition', {
                defaultMessage: 'Alert condition',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="esql"
            isCopyable
            overflowHeight={200}
            paddingSize="m"
            data-test-subj="alertingV2RuleDetailsAlertCondition"
          >
            {rule.evaluation.query.condition}
          </EuiCodeBlock>
        </>
      )}

      <EuiSpacer size="l" />

      <EuiDescriptionList
        compressed
        type="column"
        listItems={conditionItems}
        css={{ maxWidth: 600 }}
      />

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.alertingV2.ruleDetails.metadata', {
            defaultMessage: 'Metadata',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiDescriptionList
        compressed
        type="column"
        listItems={metadataItems}
        css={{ maxWidth: 600 }}
      />

      <EuiSpacer size="l" />
    </>
  );
};
