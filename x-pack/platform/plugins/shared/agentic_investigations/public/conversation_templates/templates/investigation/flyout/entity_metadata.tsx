/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityMetadataRow } from '../../../../../common';

const FIELD_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.metadata.field', {
  defaultMessage: 'Field',
});
const VALUE_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.metadata.value', {
  defaultMessage: 'Value',
});
const COPY_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.metadata.copy', {
  defaultMessage: 'Copy value',
});
const SEARCH_PLACEHOLDER = i18n.translate('xpack.agenticInvestigations.impactMap.metadata.search', {
  defaultMessage: 'Filter fields and values',
});
const NO_MATCHES = i18n.translate('xpack.agenticInvestigations.impactMap.metadata.noMatches', {
  defaultMessage: 'No fields match your filter',
});

/** The few fields that locate the entity best, on the flyout's first page. */
export const FeaturedMetadata: React.FC<{ rows: EntityMetadataRow[] }> = ({ rows }) => {
  const featured = rows.filter(({ featured: isFeatured }) => isFeatured);
  if (featured.length === 0) {
    return null;
  }
  return (
    <EuiDescriptionList
      compressed
      type="column"
      columnWidths={[1, 2]}
      data-test-subj="agenticInvestigationsImpactMapFeaturedMetadata"
      listItems={featured.map(({ key, label, value }) => ({
        title: label,
        description: (
          <span data-test-subj={`agenticInvestigationsImpactMapFeatured-${key}`}>{value}</span>
        ),
      }))}
    />
  );
};

/** Every field the agent recorded for the entity, in a table that filters as you type. */
export const EntityMetadataTable: React.FC<{ rows: EntityMetadataRow[] }> = ({ rows }) => {
  const columns: Array<EuiBasicTableColumn<EntityMetadataRow>> = [
    {
      field: 'label',
      name: FIELD_LABEL,
      sortable: true,
      width: '40%',
      render: (label: string, { key, description }) => (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{label}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText
              size="xs"
              color="subdued"
              title={description}
              css={css`
                word-break: break-all;
              `}
            >
              {key}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'value',
      name: VALUE_LABEL,
      sortable: true,
      render: (value: string) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem
            css={css`
              word-break: break-word;
            `}
          >
            <EuiText size="s">{value}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={COPY_LABEL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                size="xs"
                color="text"
                aria-label={COPY_LABEL}
                onClick={() => navigator.clipboard?.writeText(value)}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];
  return (
    <EuiInMemoryTable<EntityMetadataRow>
      items={rows}
      columns={columns}
      itemId="key"
      tableCaption={FIELD_LABEL}
      search={{
        box: { incremental: true, placeholder: SEARCH_PLACEHOLDER },
      }}
      noItemsMessage={NO_MATCHES}
      data-test-subj="agenticInvestigationsImpactMapMetadataTable"
    />
  );
};
