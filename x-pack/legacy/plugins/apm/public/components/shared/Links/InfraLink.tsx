/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import url from 'url';
import { fromQuery } from './url_helpers';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

interface InfraQueryParams {
  time?: number;
  from?: number;
  to?: number;
}

interface Props extends EuiLinkAnchorProps {
  app: string;
  path?: string;
  query: InfraQueryParams;
  children?: React.ReactNode;
}

export function InfraLink({ app, path, query = {}, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const nextSearch = fromQuery(query);
  const href = url.format({
    pathname: core.http.basePath.prepend(`/app/${app}${path}`),
    search: nextSearch
  });
  return <EuiLink {...rest} href={href} />;
}
