/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSelect,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import type { EntityItem, EntityScope, EntityType } from '../../../../common/investigations/types';
import { ENTITY_TYPE_LABELS } from '../../../../common/investigations/types';
import { ENTITY_TYPE_ICONS, ICONS } from '../../icons';
import { CriticalityPill, RiskChip, ScopeStatusBadge } from './entity_badges';
import { ENTITY_TYPE_ORDER, getCriticalityTone, isEntityVisible } from './scope_helpers';
import type { ScopeFilters } from './scope_helpers';
import * as i18n from './translations';

const noWrapStyle = css`
  white-space: nowrap;
`;

type SortField = 'name' | 'type' | 'status' | 'criticality' | 'risk' | 'evidence';

/** An entity with the columns the table sorts by as top-level keys. */
type ScopeRow = EntityItem & {
  name: string;
  type: EntityType;
  criticality: string;
  risk: number;
  evidence: number;
};

const toRow = (entity: EntityItem): ScopeRow => ({
  ...entity,
  name: entity.entity.name,
  type: entity.entity.type,
  criticality: entity.entity.criticality ?? '',
  risk: entity.entity.risk_score ?? -1,
  evidence: entity.entity.evidence_ids.length,
});

const SORT_FIELDS: readonly SortField[] = [
  'name',
  'type',
  'status',
  'criticality',
  'risk',
  'evidence',
];

const CRITICALITY_RANK = { extreme: 4, high: 3, medium: 2, low: 1, none: 0 } as const;
const STATUS_RANK: Record<EntityScope, number> = {
  primary: 0,
  scoped: 1,
  suspected: 2,
  external: 3,
  dismissed: 4,
};

const getSortValue = (entity: EntityItem, field: SortField): string | number => {
  switch (field) {
    case 'name':
      return entity.entity.name.toLowerCase();
    case 'type':
      return entity.entity.type;
    case 'status':
      return STATUS_RANK[entity.status];
    case 'criticality':
      return CRITICALITY_RANK[getCriticalityTone(entity.entity.criticality)];
    case 'risk':
      return entity.entity.risk_score ?? -1;
    case 'evidence':
      return entity.entity.evidence_ids.length;
  }
};

export interface ScopeListProps {
  entities: readonly EntityItem[];
  filters: ScopeFilters;
  selectedId: string | null;
  onSelect: (entityId: string) => void;
  onSetStatus: (entity: EntityItem, status: EntityScope) => void;
}

export const ScopeList: React.FC<ScopeListProps> = ({
  entities,
  filters,
  selectedId,
  onSelect,
  onSetStatus,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntityType | ''>('');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = entities.filter(
      (entity) =>
        isEntityVisible(entity, filters) &&
        (typeFilter === '' || entity.entity.type === typeFilter) &&
        (query === '' ||
          entity.entity.name.toLowerCase().includes(query) ||
          entity.ref.toLowerCase() === query)
    );
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = getSortValue(a, sortField);
      const right = getSortValue(b, sortField);
      if (left < right) return -direction;
      if (left > right) return direction;
      return a.entity.name.localeCompare(b.entity.name);
    });
  }, [entities, filters, search, typeFilter, sortField, sortDirection]);

  const columns: Array<EuiBasicTableColumn<ScopeRow>> = [
    {
      field: 'name',
      name: i18n.COL_ENTITY,
      sortable: true,
      truncateText: true,
      render: (_value: unknown, entity: ScopeRow) => (
        <EuiButtonEmpty
          size="s"
          flush="left"
          onClick={() => onSelect(entity.id)}
          aria-label={i18n.ACTION_INSPECT_DESC(entity.entity.name)}
          title={entity.entity.name}
          data-test-subj={`investigationScopeRowName-${entity.id}`}
        >
          {entity.entity.name}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'type',
      name: i18n.COL_TYPE,
      width: '104px',
      sortable: true,
      render: (_value: unknown, entity: ScopeRow) => (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          wrap={false}
          css={noWrapStyle}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type={ENTITY_TYPE_ICONS[entity.entity.type]} aria-hidden="true" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{ENTITY_TYPE_LABELS[entity.entity.type]}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'status',
      name: i18n.COL_STATUS,
      width: '120px',
      sortable: true,
      render: (_value: unknown, entity: ScopeRow) => (
        <span css={noWrapStyle}>
          <ScopeStatusBadge status={entity.status} short />
        </span>
      ),
    },
    {
      field: 'criticality',
      name: i18n.COL_CRITICALITY,
      width: '112px',
      sortable: true,
      render: (_value: unknown, entity: ScopeRow) => (
        <span css={noWrapStyle}>
          <CriticalityPill criticality={entity.entity.criticality} />
        </span>
      ),
    },
    {
      field: 'risk',
      name: i18n.COL_RISK,
      width: '128px',
      sortable: true,
      render: (_value: unknown, entity: ScopeRow) =>
        entity.entity.risk_score === null || entity.entity.risk_score === undefined ? (
          <EuiText size="s" color="subdued">
            {i18n.EMPTY_VALUE}
          </EuiText>
        ) : (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            wrap={false}
            css={noWrapStyle}
          >
            <EuiFlexItem grow={false}>
              <RiskChip score={entity.entity.risk_score} />
            </EuiFlexItem>
            {entity.entity.risk_level ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {entity.entity.risk_level}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
    },
    {
      field: 'evidence',
      name: i18n.COL_EVIDENCE,
      width: '92px',
      sortable: true,
      align: 'right',
      render: (_value: unknown, entity: ScopeRow) => entity.entity.evidence_ids.length,
    },
    {
      name: i18n.COL_ACTIONS,
      width: '84px',
      actions: [
        {
          name: i18n.ACTION_ADD_TO_SCOPE,
          description: i18n.ACTION_ADD_TO_SCOPE,
          icon: ICONS.check,
          type: 'icon',
          available: (entity: ScopeRow) => entity.status === 'suspected',
          onClick: (entity: ScopeRow) => onSetStatus(entity, 'scoped'),
          'data-test-subj': 'investigationScopeRowAdd',
        },
        {
          name: i18n.ACTION_DISMISS,
          description: i18n.ACTION_DISMISS,
          icon: ICONS.close,
          type: 'icon',
          available: (entity: ScopeRow) =>
            entity.status !== 'dismissed' && entity.status !== 'external',
          onClick: (entity: ScopeRow) => onSetStatus(entity, 'dismissed'),
          'data-test-subj': 'investigationScopeRowDismiss',
        },
      ],
    },
  ];

  const handleChange = ({ page, sort }: CriteriaWithPagination<ScopeRow>) => {
    setPageIndex(page.index);
    setPageSize(page.size);
    if (sort) {
      setSortField(SORT_FIELDS.find((field) => field === sort.field) ?? 'status');
      setSortDirection(sort.direction);
    }
  };

  const visibleRows = rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize).map(toRow);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationScopeList">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              compressed
              placeholder={i18n.LIST_SEARCH}
              aria-label={i18n.LIST_SEARCH}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPageIndex(0);
              }}
              isClearable
              data-test-subj="investigationScopeListSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              aria-label={i18n.LIST_TYPE_FILTER}
              value={typeFilter}
              options={[
                { value: '', text: i18n.LIST_ALL_TYPES },
                ...ENTITY_TYPE_ORDER.map((type) => ({
                  value: type,
                  text: ENTITY_TYPE_LABELS[type],
                })),
              ]}
              onChange={(event) => {
                const { value } = event.target;
                setTypeFilter(ENTITY_TYPE_ORDER.find((type) => type === value) ?? '');
                setPageIndex(0);
              }}
              data-test-subj="investigationScopeListType"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable<ScopeRow>
          tableCaption={i18n.LIST_TABLE_CAPTION}
          tableLayout="fixed"
          items={visibleRows}
          itemId="id"
          columns={columns}
          noItemsMessage={i18n.NO_MATCH}
          sorting={{ sort: { field: sortField, direction: sortDirection } }}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: rows.length,
            pageSizeOptions: [10, 25, 50],
          }}
          onChange={handleChange}
          rowProps={(entity) => ({
            'data-test-subj': `investigationScopeRow-${entity.id}`,
            'aria-selected': entity.id === selectedId,
          })}
          data-test-subj="investigationScopeTable"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
ScopeList.displayName = 'ScopeList';
