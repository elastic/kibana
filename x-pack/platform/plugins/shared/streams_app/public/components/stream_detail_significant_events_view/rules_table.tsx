/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface RuleTableItem {
  id: string;
}

const columns: Array<EuiBasicTableColumn<RuleTableItem>> = [];

export function RulesTable() {
  return (
    <>
      <span>
        {i18n.translate('xpack.streams.rulesTable.span.rulesLabel', { defaultMessage: 'Rules' })}
      </span>
      <EuiInMemoryTable<RuleTableItem>
        items={[]}
        columns={columns}
        tableCaption={i18n.translate('xpack.streams.rulesTable.tableCaption', {
          defaultMessage: 'Rules',
        })}
      />
    </>
  );
}
