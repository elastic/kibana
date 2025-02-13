/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { useAppContext } from '../../../../app_context';
import { getEsDeprecationError } from '../../../../lib/get_es_deprecation_error';
import { DeprecationIssuesPanel } from './deprecation_issues_panel';

interface Props {
  setIsFixed: (isFixed: boolean) => void;
}

export const EsDeprecationIssuesPanel: FunctionComponent<Props> = ({ setIsFixed }) => {
  const {
    services: { api },
  } = useAppContext();

  const { data: esDeprecations, isLoading, error } = api.useLoadEsDeprecations();

  const criticalDeprecationsCount =
    esDeprecations?.migrationsDeprecations?.filter((deprecation) => deprecation.isCritical)
      ?.length ?? 0;

  const warningDeprecationsCount =
    esDeprecations?.migrationsDeprecations?.filter(
      (deprecation) => deprecation.isCritical === false
    )?.length ?? 0;

  const errorMessage = error && getEsDeprecationError(error).message;

  return (
    <DeprecationIssuesPanel
      data-test-subj="esStatsPanel"
      deprecationSource="Elasticsearch"
      linkUrl="/es_deprecations"
      criticalDeprecationsCount={criticalDeprecationsCount}
      warningDeprecationsCount={warningDeprecationsCount}
      isLoading={isLoading}
      errorMessage={errorMessage}
      setIsFixed={setIsFixed}
    />
  );
};
