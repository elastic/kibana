/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useService } from '@kbn/core-di-browser';
import useMountedState from 'react-use/lib/useMountedState';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { RuleListItem } from '../services/rules_api';
import { RulesApi } from '../services/rules_api';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const RulesListPage = () => {
  const history = useHistory();
  const rulesApi = useService(RulesApi);
  const isMounted = useMountedState();
  const [rules, setRules] = useState<RuleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRules = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await rulesApi.listRules({ page: 1, perPage: 100 });
        if (isMounted()) {
          setRules(result.items);
        }
      } catch (err) {
        if (isMounted()) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    };

    loadRules();
  }, [rulesApi, isMounted]);

  const columns: Array<EuiBasicTableColumn<RuleListItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.name" defaultMessage="Name" />
        ),
      },
      {
        field: 'id',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.id" defaultMessage="Rule ID" />
        ),
      },
      {
        field: 'enabled',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.rulesList.column.enabled"
            defaultMessage="Enabled"
          />
        ),
        render: (enabled?: boolean) =>
          enabled ? (
            <FormattedMessage id="xpack.alertingV2.rulesList.enabledYes" defaultMessage="Yes" />
          ) : (
            <FormattedMessage id="xpack.alertingV2.rulesList.enabledNo" defaultMessage="No" />
          ),
      },
      {
        field: 'schedule',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.rulesList.column.schedule"
            defaultMessage="Schedule"
          />
        ),
        render: (schedule?: RuleListItem['schedule']) =>
          schedule?.custom ? (
            schedule.custom
          ) : (
            <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
          ),
      },
      {
        field: 'query',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.query" defaultMessage="Query" />
        ),
        render: (query?: string) =>
          query ? (
            <EuiCodeBlock
              language="esql"
              paddingSize="s"
              fontSize="s"
              transparentBackground
              isCopyable
            >
              {query}
            </EuiCodeBlock>
          ) : (
            <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
          ),
      },
      {
        field: 'tags',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.tags" defaultMessage="Tags" />
        ),
        render: (tags?: string[]) =>
          tags && tags.length ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {tags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
          ),
      },
      {
        name: (
          <FormattedMessage
            id="xpack.alertingV2.rulesList.column.actions"
            defaultMessage="Actions"
          />
        ),
        actions: [
          {
            name: i18n.translate('xpack.alertingV2.rulesList.action.edit', {
              defaultMessage: 'Edit',
            }),
            description: i18n.translate('xpack.alertingV2.rulesList.action.editDescription', {
              defaultMessage: 'Edit rule',
            }),
            icon: 'pencil',
            type: 'icon',
            onClick: (rule) => history.push(`/edit/${rule.id}`),
          },
        ],
      },
    ],
    [history]
  );

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.rulesList.pageTitle"
            defaultMessage="Alerting V2 Rules"
          />
        }
        rightSideItems={[
          <EuiButton key="create-rule" onClick={() => history.push('/create')}>
            <FormattedMessage
              id="xpack.alertingV2.rulesList.createRuleButton"
              defaultMessage="Create rule"
            />
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="m" />
      {error ? (
        <>
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.alertingV2.rulesList.loadErrorTitle"
                defaultMessage="Failed to load rules"
              />
            }
            color="danger"
            iconType="error"
          >
            {error}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      <EuiBasicTable
        items={rules}
        columns={columns}
        loading={isLoading}
        tableCaption={i18n.translate('xpack.alertingV2.rulesList.tableCaption', {
          defaultMessage: 'Rules',
        })}
      />
    </>
  );
};
