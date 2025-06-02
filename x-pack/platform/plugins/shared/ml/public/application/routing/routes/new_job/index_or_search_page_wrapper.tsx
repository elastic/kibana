/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { useMlKibana } from '../../../contexts/kibana';
import { useRouteResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import type { PageProps } from '../../router';
import { PageLoader } from '../../router';
import { preConfiguredJobRedirect } from '../../../jobs/new_job/pages/index_or_search';

const Page = dynamic(async () => ({
  default: (await import('../../../jobs/new_job/pages/index_or_search')).Page,
}));

interface IndexOrSearchPageProps extends PageProps {
  nextStepPath: string;
  mode: MODE;
  extraButtons?: React.ReactNode;
}

export enum MODE {
  NEW_JOB,
  DATAVISUALIZER,
}

export const PageWrapper: FC<IndexOrSearchPageProps> = ({ nextStepPath, mode, extraButtons }) => {
  const {
    services: {
      http: { basePath },
      application: { navigateToUrl },
      data: { dataViews: dataViewsService },
    },
  } = useMlKibana();

  const newJobResolvers = {
    ...basicResolvers(),
    preConfiguredJobRedirect: () =>
      preConfiguredJobRedirect(dataViewsService, basePath.get(), navigateToUrl),
  };

  const { context } = useRouteResolver(
    mode === MODE.NEW_JOB ? 'full' : 'basic',
    mode === MODE.NEW_JOB ? ['canCreateJob'] : [],
    mode === MODE.NEW_JOB ? newJobResolvers : {}
  );
  return (
    <PageLoader context={context}>
      <Page {...{ nextStepPath, extraButtons }} />
    </PageLoader>
  );
};
