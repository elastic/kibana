/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type PathsOf, type TypeOf, useParams } from '@kbn/typed-react-router-config';
import type { SignificantEventsAppRoutes } from '../routes/config';

export function useSignificantEventsAppParams<TPath extends PathsOf<SignificantEventsAppRoutes>>(
  path: TPath,
  optional: boolean = false
): TypeOf<SignificantEventsAppRoutes, TPath> {
  return useParams(path, optional)! as TypeOf<SignificantEventsAppRoutes, TPath>;
}
