/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import url from 'url';
import rison, { RisonValue } from 'rison-node';
import { useLocation } from '../../../../hooks/useLocation';
import { getTimepickerRisonData, TimepickerRisonData } from '../rison_helpers';
import { useKibanaCore } from '../../../../../../observability/public';

interface MlRisonData {
  ml?: {
    jobIds: string[];
  };
}

interface Props {
  query?: MlRisonData;
  path?: string;
  children?: React.ReactNode;
}

export function MLLink({ children, path = '', query = {} }: Props) {
  const core = useKibanaCore();
  const location = useLocation();

  const risonQuery: MlRisonData & TimepickerRisonData = getTimepickerRisonData(
    location.search
  );

  if (query.ml) {
    risonQuery.ml = query.ml;
  }

  const href = url.format({
    pathname: core.http.basePath.prepend('/app/ml'),
    hash: `${path}?_g=${rison.encode(risonQuery as RisonValue)}`
  });

  return <EuiLink children={children} href={href} />;
}
