/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { LifecycleResponseFactory } from '@kbn/core-http-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { InitialSolutionSetupService } from '../../initial_solution_setup/initial_solution_setup_service';
import type { SpacesServiceStart } from '../../spaces_service';
import { wrapError } from '../errors';
import { getSpaceSelectorUrl } from '../get_space_selector_url';

export async function maybeRedirectForInitialSolutionSetup({
  request,
  response,
  spacesService,
  initialSolutionSetup,
  serverBasePath,
  log,
}: {
  request: KibanaRequest;
  response: LifecycleResponseFactory;
  spacesService: SpacesServiceStart;
  initialSolutionSetup: InitialSolutionSetupService;
  serverBasePath: string;
  log: Logger;
}) {
  if (!initialSolutionSetup.isEligible()) {
    return undefined;
  }

  const path = request.url.pathname;
  const spaceId = spacesService.getSpaceId(request);

  const isRequestingKibanaRoot = path === '/' && spaceId === DEFAULT_SPACE_ID;
  const isRequestingApplication = path.startsWith('/app');
  const isEnteringSpace = path === '/spaces/enter';

  if (
    !request.auth.isAuthenticated ||
    spaceId !== DEFAULT_SPACE_ID ||
    !(isRequestingKibanaRoot || isRequestingApplication || isEnteringSpace)
  ) {
    return undefined;
  }

  try {
    const spacesClient = spacesService.createSpacesClient(request);
    if (await initialSolutionSetup.isRequired(spacesClient)) {
      const next = isRequestingApplication
        ? `${request.url.pathname}${request.url.search}`
        : request.url.searchParams.get('next') ?? undefined;
      return response.redirected({
        headers: { location: getSpaceSelectorUrl(serverBasePath, next) },
      });
    }
  } catch (error) {
    const wrappedError = wrapError(error);
    if (wrappedError.statusCode === 403) {
      log.debug(`Skipping initial solution setup redirect; unauthorized. ${error}`);
    } else {
      log.warn(`Failed to check initial solution setup state: ${error}`);
    }
  }

  return undefined;
}
