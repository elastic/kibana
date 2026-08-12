/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import { fullWidthContentCss } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { SavedQueriesTable } from './saved_queries_table';

export interface SavedQuerySO {
  name: string;
  id: string;
  saved_object_id: string;
  description?: string;
  query: string;
  timeout?: number;
  ecs_mapping: ECSMapping;
  created_by?: string;
  created_by_profile_uid?: string;
  updated_at: string;
  updated_by?: string;
  updated_by_profile_uid?: string;
  prebuilt?: boolean;
}

const SavedQueriesPageComponent = () => {
  useBreadcrumbs('saved_queries');

  return (
    <div css={fullWidthContentCss}>
      <SavedQueriesTable />
    </div>
  );
};

export const QueriesPage = React.memo(SavedQueriesPageComponent);
