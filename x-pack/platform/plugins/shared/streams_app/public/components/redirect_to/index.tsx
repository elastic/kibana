/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';
import { useLayoutEffect } from 'react';
import type { PathsOf, TypeOf } from '@kbn/typed-react-router-config';
import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { StreamsAppRoutes } from '../../routes/config';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';

export function RedirectTo<
  TPath extends PathsOf<StreamsAppRoutes>,
  TParams extends TypeOf<StreamsAppRoutes, TPath, false>
>({
  children,
  path,
  params,
}: React.PropsWithChildren<{ path: TPath; params?: DeepPartial<TParams> }>) {
  const router = useStreamsAppRouter();
  const currentParams = useStreamsAppParams('/*');
  useLayoutEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(path, ...([merge({}, currentParams, params)] as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children ?? null;
}
