/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout, fullWidthFormContentCss } from '../../../components/layouts';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';
import { NewSavedQueryForm } from './form';
import { useCreateSavedQuery } from '../../../saved_queries/use_create_saved_query';

const NewSavedQueryPageComponent = () => {
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
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

  if (isHistoryEnabled) {
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
  }

  const LeftColumn = (
    <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
      <EuiFlexItem>{backLink}</EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.osquery.addSavedQuery.pageTitle"
              defaultMessage="Add saved query"
            />
          </h1>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <NewSavedQueryForm handleSubmit={handleSubmit} />
    </WithHeaderLayout>
  );
};

export const NewSavedQueryPage = React.memo(NewSavedQueryPageComponent);
