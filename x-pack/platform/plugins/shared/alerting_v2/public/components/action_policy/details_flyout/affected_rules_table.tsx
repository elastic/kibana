/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiLink, type Criteria, type EuiBasicTableColumn } from '@elastic/eui';
import { FIND_MAX_RESULT_WINDOW, type PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useAlertingLocators } from '../../../application/locator_context';
import { useFetchMatchingRules } from '../../../hooks/use_fetch_matching_rules';
import type { RuleApiResponse } from '../../../services/rules_api';
import { EMPTY_VALUE } from '../../../utils/rule_display';
import { BadgeList } from '../badge_list';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface Props {
  matcher?: PolicyMatcher | null;
}

export const AffectedRulesTable = ({ matcher }: Props) => {
  const { rulesLocators } = useAlertingLocators();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const { data, isLoading, isFetching, isError } = useFetchMatchingRules({
    matcher,
    page,
    perPage,
  });

  const columns: Array<EuiBasicTableColumn<RuleApiResponse>> = [
    {
      field: 'metadata.name',
      name: i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.column.name', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      render: (name: RuleApiResponse['metadata']['name'], { id }: RuleApiResponse) => (
        <EuiLink
          href={rulesLocators.getRedirectUrl({ ruleId: id })}
          target="_blank"
          rel="noopener noreferrer"
          data-test-subj={`actionPolicyAffectedRulesRuleNameLink-${id}`}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'metadata.routing_tags',
      name: i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.column.tags', {
        defaultMessage: 'Routing tags',
      }),
      render: (tags: RuleApiResponse['metadata']['routing_tags']) =>
        tags?.length ? <BadgeList items={tags} /> : EMPTY_VALUE,
    },
  ];

  const onTableChange = ({ page: tablePage }: Criteria<RuleApiResponse>) => {
    if (!tablePage) {
      return;
    }
    setPage(tablePage.index + 1);
    setPerPage(tablePage.size);
  };

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.tableCaption', {
        defaultMessage: 'Rules affected by this policy',
      })}
      items={data?.items ?? []}
      itemId="id"
      columns={columns}
      loading={isFetching}
      error={
        isError
          ? i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.error', {
              defaultMessage: 'Unable to load the rules affected by this policy.',
            })
          : undefined
      }
      noItemsMessage={
        isLoading
          ? i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.loading', {
              defaultMessage: 'Loading rules…',
            })
          : i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.noRules', {
              defaultMessage:
                'No rules that create alerts have any of the routing tags in this policy scope.',
            })
      }
      pagination={{
        pageIndex: page - 1,
        pageSize: perPage,
        totalItemCount: Math.min(data?.total ?? 0, FIND_MAX_RESULT_WINDOW),
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
      onChange={onTableChange}
      data-test-subj="actionPolicyAffectedRulesTable"
    />
  );
};
