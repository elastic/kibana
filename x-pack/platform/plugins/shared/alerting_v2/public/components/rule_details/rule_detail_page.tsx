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
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { formatDuration } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { RuleApiResponse } from '../../services/rules_api';
import { RuleDetailsActionsMenu } from './rule_details_actions_menu';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { RulesDeleteModalConfirmation } from '../common/rules_delete_modal_confirmation';
import { RuleHeaderDescription } from './rule_header_description';
import { ItemValueRuleSummary } from './item_value_rule_summary';

export interface RuleDetailPageProps {
  rule: RuleApiResponse;
}

const EMPTY_VALUE = '-';

export const RuleDetailPage: React.FunctionComponent<RuleDetailPageProps> = ({ rule }) => {
  useBreadcrumbs('rule_details', { ruleName: rule.metadata?.name });

  const history = useHistory();
  const { deleteRule } = useDeleteRule();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);

  const showDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(true);
  };

  const handleRuleDelete = async () => {
    setShowDeleteConfirmation(false);
    deleteRule(rule.id, () => {
      history.push(`/`);
    });
  };

  const configurationListItems = [
    {
      title: i18n.translate('xpack.alertingV2.ruleDetails.runsEvery', {
        defaultMessage: 'Runs every',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsSchedule"
          itemValue={formatDuration(rule.schedule.every)}
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
          itemValue={rule.schedule.lookback ?? EMPTY_VALUE}
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
      title: i18n.translate('xpack.alertingV2.ruleDetails.groupBy', {
        defaultMessage: 'Group by',
      }),
      description: (
        <ItemValueRuleSummary
          data-test-subj="alertingV2RuleDetailsGroupBy"
          itemValue={rule.grouping?.fields?.length ? rule.grouping?.fields.join(', ') : EMPTY_VALUE}
        />
      ),
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
        pageTitle={
          <span data-test-subj="ruleName">
            <FormattedMessage
              id="xpack.alertingV2.sections.ruleDetails.ruleDetailsTitle"
              defaultMessage="{ruleName}"
              values={{ ruleName: rule.metadata.name }}
            />
          </span>
        }
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
              { defaultMessage: 'Edit' }
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
              defaultMessage="Edit"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="m" />

      <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
        <EuiTitle size="s">
          <EuiText>
            {i18n.translate('xpack.alertingV2.sections.ruleDetails.definition', {
              defaultMessage: 'Configuration',
            })}
          </EuiText>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiDescriptionList
          compressed={true}
          type="column"
          listItems={configurationListItems}
          css={{ alignItems: 'start' }}
        />
      </EuiPanel>
      <EuiSpacer size="s" />

      <EuiPanel color="subdued" hasBorder={false} paddingSize="m">
        <EuiTitle size="s">
          <EuiText>
            {i18n.translate('xpack.alertingV2.sections.ruleDetails.query', {
              defaultMessage: 'ES|QL Query',
            })}
          </EuiText>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder paddingSize="none" css={{ width: '100%' }}>
          <EuiCodeBlock
            language="esql"
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

      <EuiSpacer size="m" />
    </>
  );
};
