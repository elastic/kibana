/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps } from './APMLink';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { pickKeys } from '../../../../utils/pickKeys';

const TraceOverviewLink = (props: APMLinkExtendProps) => {
  const { urlParams } = useUrlParams();

  const persistedFilters = pickKeys(
    urlParams,
    'transactionResult',
    'host',
    'containerId',
    'podName'
  );

  return <APMLink path="/traces" query={persistedFilters} {...props} />;
};

export { TraceOverviewLink };
