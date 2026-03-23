/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SignificantEventQueryRow } from '../../hooks/use_fetch_discovery_queries';

interface RulesTableProps {
  rules: SignificantEventQueryRow[];
  searchTerm: string;
}

const columns: Array<EuiBasicTableColumn<SignificantEventQueryRow>> = [];

export function RulesTable({ rules, searchTerm }: RulesTableProps) {
  const filteredRules = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return rules;
    }

    return rules.filter((rule) => {
      const title = (rule.query.title ?? '').toLowerCase();
      return title.includes(normalizedSearchTerm);
    });
  }, [rules, searchTerm]);

  return (
    <EuiInMemoryTable<SignificantEventQueryRow>
      items={filteredRules}
      columns={columns}
      pagination={{
        initialPageSize: 10,
        pageSizeOptions: [10, 25, 50],
      }}
      tableCaption={i18n.translate('xpack.streams.rulesTable.tableCaption', {
        defaultMessage: 'Rules',
      })}
    />
  );
}
