/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { fullWidthFormContentCss } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { NewSavedQueryForm } from './form';
import { useCreateSavedQuery } from '../../../saved_queries/use_create_saved_query';

const NewSavedQueryPageComponent = () => {
  useBreadcrumbs('saved_query_new');
  const savedQueryListProps = useRouterNavigate('saved_queries');

  const { mutateAsync } = useCreateSavedQuery({ withRedirect: true });

  const handleSubmit = useCallback(
    async (payload: any) => {
      await mutateAsync(payload);
    },
    [mutateAsync]
  );

  const backLink = useMemo(
    () => (
      <EuiButtonEmpty iconType="chevronSingleLeft" {...savedQueryListProps} flush="left" size="xs">
        <FormattedMessage
          id="xpack.osquery.addSavedQuery.viewSavedQueriesListTitle"
          defaultMessage="View all saved queries"
        />
      </EuiButtonEmpty>
    ),
    [savedQueryListProps]
  );

  return (
    <div css={fullWidthFormContentCss}>
      <EuiSpacer size="l" />
      {backLink}
      <EuiSpacer size="m" />
      <EuiText>
        <h1>
          <FormattedMessage
            id="xpack.osquery.addSavedQuery.pageTitle"
            defaultMessage="Add saved query"
          />
        </h1>
      </EuiText>
      <EuiSpacer size="l" />
      <NewSavedQueryForm handleSubmit={handleSubmit} />
    </div>
  );
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
