/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ApiKeys } from '../store/api_keys';
import { chooseApiKeySource, isApiKeyAuthenticated } from './choose_source';
import { clone, grant } from './grant';
import { reuse } from './reuse';
import type { ClientContext, ResolveOptions } from './types';

/**
 * Returns the API keys a plugin should store for the request: the caller's own key, a clone of
 * it, or freshly granted keys (see {@link chooseApiKeySource}). `null` when API keys are disabled.
 */
export const resolve = async (
  context: ClientContext,
  request: KibanaRequest,
  options: ResolveOptions
): Promise<ApiKeys | null> => {
  const source = chooseApiKeySource({
    apiKeyAuthenticated: isApiKeyAuthenticated(context.security, request),
    clone: options.clone === true,
    reuse: context.profile.reuse,
  });

  switch (source) {
    case 'reuse':
      return reuse(context, request, options);
    case 'clone':
      return clone(context, request, options);
    case 'grant':
      return grant(context, request, options);
  }
};
