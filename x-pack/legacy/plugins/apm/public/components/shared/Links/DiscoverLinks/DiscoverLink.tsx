/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';
import url from 'url';
import rison, { RisonValue } from 'rison-node';
import { useAPMIndexPattern } from '../../../../hooks/useAPMIndexPattern';
import { useLocation } from '../../../../hooks/useLocation';
import { getTimepickerRisonData } from '../rison_helpers';

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
  const apmIndexPattern = useAPMIndexPattern();
  const location = useLocation();

  if (!apmIndexPattern.id) {
    return null;
  }

  const risonQuery = {
    _g: getTimepickerRisonData(location.search),
    _a: {
      ...query._a,
      index: apmIndexPattern.id
    }
  };

  const href = url.format({
    pathname: chrome.addBasePath('/app/kibana'),
    hash: `/discover?_g=${rison.encode(risonQuery._g)}&_a=${rison.encode(
      risonQuery._a as RisonValue
    )}`
  });

  return <EuiLink {...rest} href={href} />;
}
