/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { useMatchRoutes } from '@kbn/typed-react-router-config';
import { last } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';

const getPageName = (path: string, params: Record<string, Record<string, string>>): string => {
  if (path === '/') {
    return 'stream_list';
  }
  if (path === '/_discovery/{tab}') {
    return `discovery_${params?.path?.tab ?? 'unknown'}`;
  }
  if (path === '/{key}/management/{tab}') {
    return `management_${params?.path?.tab ?? 'unknown'}`;
  }
  return path;
};

export function UpdateExecutionContextOnRouteChange({
  children,
}: {
  children: React.ReactElement;
}) {
  const { core } = useKibana();
  const lastMatch = last(useMatchRoutes());

  const page = lastMatch
    ? getPageName(
        lastMatch.match.path,
        lastMatch.match.params as Record<string, Record<string, string>>
      )
    : undefined;

  useExecutionContext(core.executionContext, {
    type: 'application',
    name: 'streams',
    page,
  });

  return children;
}
