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
import type { RuleApiResponse } from '../services/rules_api';
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
  const [rules, setRules] = useState<RuleApiResponse[]>([]);
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

  const columns: Array<EuiBasicTableColumn<RuleApiResponse>> = useMemo(
    () => [
      {
        field: 'metadata',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.name" defaultMessage="Name" />
        ),
        render: (metadata: RuleApiResponse['metadata']) => metadata?.name ?? '-',
      },
      {
        field: 'id',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.id" defaultMessage="Rule ID" />
        ),
      },
      {
        field: 'kind',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.kind" defaultMessage="Kind" />
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
        render: (enabled: boolean) =>
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
        render: (schedule: RuleApiResponse['schedule']) =>
          schedule?.every ?? (
            <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
          ),
      },
      {
        field: 'evaluation',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.query" defaultMessage="Query" />
        ),
        render: (evaluation: RuleApiResponse['evaluation']) => {
          const query = evaluation?.query?.base;
          return query ? (
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
          );
        },
      },
      {
        field: 'metadata',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.labels" defaultMessage="Labels" />
        ),
        render: (metadata: RuleApiResponse['metadata']) => {
          const labels = metadata?.labels;
          return labels && labels.length ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {labels.map((label) => (
                <EuiFlexItem key={label} grow={false}>
                  <EuiBadge color="hollow">{label}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
          );
        },
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
