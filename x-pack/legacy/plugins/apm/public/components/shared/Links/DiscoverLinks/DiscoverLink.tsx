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
import { getTimepickerRisonData } from '../rison_helpers';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../../../../common/index_pattern_constants';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';

interface Props {
  query: {
    _a?: {
      index?: string;
      interval?: string;
      query?: {
        language: string;
        query: string;
      };
      sort?: {
        [key: string]: string;
      };
    };
  };
  children: React.ReactNode;
}

export function DiscoverLink({ query = {}, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const location = useLocation();

  const risonQuery = {
    _g: getTimepickerRisonData(location.search),
    _a: {
      ...query._a,
      index: APM_STATIC_INDEX_PATTERN_ID
    }
  };

  const href = url.format({
    pathname: core.http.basePath.prepend('/app/kibana'),
    hash: `/discover?_g=${rison.encode(risonQuery._g)}&_a=${rison.encode(
      risonQuery._a as RisonValue
    )}`
  });

  return <EuiLink {...rest} href={href} />;
}
