/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiSpacer,
  useEuiTheme,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { EvaluatorKindBadge } from '../../components/evaluator_kind_badge';
import { useListEvaluators, type EvaluatorSummary } from '../../hooks/use_evaluators_api';
import { CreateEvaluatorFlyout } from './create_evaluator_flyout';
import { EvaluatorDetailFlyout } from './evaluator_detail_flyout';
import * as i18n from './translations';

const TYPE_BADGE_COLORS: Record<string, string> = {
  'llm-judge': 'accent',
  code: 'primary',
  esql: 'warning',
  prebuilt: 'hollow',
};

export const EvaluatorCatalogPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string | null>(null);

  const { data, isLoading, error } = useListEvaluators({
    page: pageIndex + 1,
    perPage: pageSize,
    search: searchText || undefined,
  });

  const columns: Array<EuiBasicTableColumn<EvaluatorSummary>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: true,
        truncateText: true,
      },
      {
        field: 'kind',
        name: i18n.COLUMN_KIND,
        width: '80px',
        render: (kind: EvaluatorSummary['kind']) => <EvaluatorKindBadge kind={kind} />,
      },
      {
        field: 'type',
        name: i18n.COLUMN_TYPE,
        width: '100px',
        render: (type: EvaluatorSummary['type']) => (
          <EuiBadge color={TYPE_BADGE_COLORS[type] ?? 'hollow'}>{type}</EuiBadge>
        ),
      },
      {
        field: 'description',
        name: i18n.COLUMN_DESCRIPTION,
        truncateText: true,
        render: (description: string) => description || '-',
      },
      {
        field: 'usage_count',
        name: i18n.COLUMN_USAGE_COUNT,
        sortable: true,
        width: '100px',
      },
      {
        field: 'version',
        name: i18n.COLUMN_VERSION,
        width: '80px',
        render: (version: number) => `v${version}`,
      },
    ],
    []
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const onTableChange = ({ page }: CriteriaWithPagination<EvaluatorSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPageIndex(0);
              }}
              isClearable
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => setIsCreateFlyoutOpen(true)} fill iconType="plusInCircle">
              {i18n.CREATE_EVALUATOR_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {error ? (
          <>
            <EuiCallOut title={String(error)} color="danger" iconType="alert" size="s" />
            <EuiSpacer size="m" />
          </>
        ) : null}
        {isLoading && !data ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" css={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : !isLoading && (data?.evaluators ?? []).length === 0 && !error ? (
          <EuiEmptyPrompt
            iconType="managementApp"
            title={<h3>{i18n.EMPTY_STATE_TITLE}</h3>}
            body={<p>{i18n.EMPTY_STATE_BODY}</p>}
            actions={
              <EuiButton onClick={() => setIsCreateFlyoutOpen(true)} fill iconType="plusInCircle">
                {i18n.CREATE_EVALUATOR_BUTTON}
              </EuiButton>
            }
          />
        ) : (
          <EuiBasicTable<EvaluatorSummary>
            items={data?.evaluators ?? []}
            columns={columns}
            loading={isLoading}
            pagination={pagination}
            onChange={onTableChange}
            rowProps={(item) => ({
              onClick: () => setSelectedEvaluatorId(item.id),
              css: { cursor: 'pointer' },
            })}
          />
        )}
      </EuiPageSection>

      {isCreateFlyoutOpen && <CreateEvaluatorFlyout onClose={() => setIsCreateFlyoutOpen(false)} />}

      {selectedEvaluatorId && (
        <EvaluatorDetailFlyout
          evaluatorId={selectedEvaluatorId}
          onClose={() => setSelectedEvaluatorId(null)}
        />
      )}
    </>
  );
};
