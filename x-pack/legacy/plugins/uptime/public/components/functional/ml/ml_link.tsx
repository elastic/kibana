/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { useContext } from 'react';
import url from 'url';
import rison, { RisonValue } from 'rison-node';
import { UptimeSettingsContext } from '../../../contexts';

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
  const { basePath } = useContext(UptimeSettingsContext);

  const href = url.format({
    pathname: basePath + '/app/ml',
    hash: `${path}?_g=${rison.encode(query as RisonValue)}`,
  });

  return <EuiLink children={children} href={href} target="_blank" />;
}
