/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useMemo, useState } from 'react';

interface SignificantEventsTableProps {
  knowledgeIndicators: KnowledgeIndicator[];
  searchTerm: string;
  selectedTypes: string[];
}

const getKnowledgeIndicatorItemId = (knowledgeIndicator: KnowledgeIndicator) => {
  if (knowledgeIndicator.kind === 'feature') {
    return `feature:${knowledgeIndicator.feature.uuid}`;
  }

  return `query:${knowledgeIndicator.query.id}`;
};

export function SignificantEventsTable({
  knowledgeIndicators,
  searchTerm,
  selectedTypes,
}: SignificantEventsTableProps) {
  const [selectedKnowledgeIndicators, setSelectedKnowledgeIndicators] = useState<
    KnowledgeIndicator[]
  >([]);

  const filteredKnowledgeIndicators = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return knowledgeIndicators.filter((knowledgeIndicator) => {
        const type =
          knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.type : 'query';

        return selectedTypes.length === 0 || selectedTypes.includes(type);
      });
    }

    return knowledgeIndicators.filter((knowledgeIndicator) => {
      const type =
        knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.type : 'query';
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(type);

      if (!matchesType) {
        return false;
      }

      if (knowledgeIndicator.kind === 'feature') {
        return (knowledgeIndicator.feature.title ?? '')
          .toLowerCase()
          .includes(normalizedSearchTerm);
      }

      return (knowledgeIndicator.query.title ?? '').toLowerCase().includes(normalizedSearchTerm);
    });
  }, [knowledgeIndicators, searchTerm, selectedTypes]);

  const columns = useMemo<Array<EuiBasicTableColumn<KnowledgeIndicator>>>(
    () => [
      {
        name: i18n.translate('xpack.streams.significantEventsTable.columns.titleLabel', {
          defaultMessage: 'Title',
        }),
        render: (knowledgeIndicator: KnowledgeIndicator) => {
          if (knowledgeIndicator.kind === 'feature') {
            return knowledgeIndicator.feature.title ?? knowledgeIndicator.feature.id;
          }

          return knowledgeIndicator.query.title ?? knowledgeIndicator.query.id;
        },
      },
      {
        name: i18n.translate('xpack.streams.significantEventsTable.columns.typeLabel', {
          defaultMessage: 'Type',
        }),
        render: (knowledgeIndicator: KnowledgeIndicator) => {
          if (knowledgeIndicator.kind === 'feature') {
            return knowledgeIndicator.feature.type;
          }

          return i18n.translate('xpack.streams.significantEventsTable.columns.queryTypeLabel', {
            defaultMessage: 'Query',
          });
        },
      },
      {
        name: i18n.translate('xpack.streams.significantEventsTable.columns.actionsLabel', {
          defaultMessage: 'Actions',
        }),
        width: '120px',
        render: () => null,
      },
    ],
    []
  );

  return (
    <EuiInMemoryTable<KnowledgeIndicator>
      items={filteredKnowledgeIndicators}
      itemId={getKnowledgeIndicatorItemId}
      columns={columns}
      selection={{
        selected: selectedKnowledgeIndicators,
        onSelectionChange: setSelectedKnowledgeIndicators,
      }}
      pagination={{
        initialPageSize: 25,
        pageSizeOptions: [25, 50, 100],
      }}
      tableCaption={i18n.translate('xpack.streams.significantEventsTable.tableCaption', {
        defaultMessage: 'Significant events',
      })}
    />
  );
}
