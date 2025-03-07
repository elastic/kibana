/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiLink } from '@elastic/eui';
import { useAppContext } from '../../../app_context';

export const ConnectorViewIndexLink: React.FC<{
  indexName: string;
  target?: boolean;
}> = ({ indexName, target }) => {
  const {
    plugins: { share },
  } = useAppContext();

  const searchIndexDetailsUrl = share?.url.locators
    .get('SEARCH_INDEX_DETAILS_LOCATOR_ID')
    ?.useUrl({ indexName });

  return searchIndexDetailsUrl ? (
    <EuiLink
      target={target ? '_blank' : undefined}
      external={target ?? false}
      href={searchIndexDetailsUrl}
    >
      {indexName}
    </EuiLink>
  ) : (
    <>{indexName}</>
  );
};
