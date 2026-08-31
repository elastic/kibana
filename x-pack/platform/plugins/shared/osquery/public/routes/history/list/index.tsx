/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fullWidthContentCss } from '../../../components/layouts';
import { UnifiedHistoryTable } from '../../../actions/unified_history_table';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

const HistoryPageComponent = () => {
  useBreadcrumbs('history');

  return (
    <div css={fullWidthContentCss}>
      <UnifiedHistoryTable />
    </div>
  );
};

export const HistoryPage = React.memo(HistoryPageComponent);
