/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { fullWidthFormContentCss } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { NewSavedQueryForm } from './form';
import { useCreateSavedQuery } from '../../../saved_queries/use_create_saved_query';

const NewSavedQueryPageComponent = () => {
  useBreadcrumbs('saved_query_new');

  const { mutateAsync } = useCreateSavedQuery({ withRedirect: true });

  const handleSubmit = useCallback(
    async (payload: any) => {
      await mutateAsync(payload);
    },
    [mutateAsync]
  );

  return (
    <div css={fullWidthFormContentCss}>
      <NewSavedQueryForm handleSubmit={handleSubmit} />
    </div>
  );
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
