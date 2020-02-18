/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { compact } from 'lodash';
import React from 'react';
import url from 'url';
import { fromQuery } from './url_helpers';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { AppMountContextBasePath } from '../../../context/ApmPluginContext';

interface InfraQueryParams {
  time?: number;
  from?: number;
  to?: number;
  filter?: string;
}

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query: InfraQueryParams;
  children?: React.ReactNode;
}

export const getInfraHref = ({
  basePath,
  query,
  path
}: {
  basePath: AppMountContextBasePath;
  query: InfraQueryParams;
  path?: string;
}) => {
  const nextSearch = fromQuery(query);
  return url.format({
    pathname: basePath.prepend('/app/infra'),
    hash: compact([path, nextSearch]).join('?')
  });
};

export function InfraLink({ path, query = {}, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const href = getInfraHref({ basePath: core.http.basePath, query, path });
  return <EuiLink {...rest} href={href} />;
}
