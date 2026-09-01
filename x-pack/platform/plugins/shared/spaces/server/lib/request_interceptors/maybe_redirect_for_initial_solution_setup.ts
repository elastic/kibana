/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { LifecycleResponseFactory } from '@kbn/core-http-server';

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
  next,
}: {
  request: KibanaRequest;
  response: LifecycleResponseFactory;
  spacesService: SpacesServiceStart;
  initialSolutionSetup: InitialSolutionSetupService;
  serverBasePath: string;
  log: Logger;
  next?: string;
}) {
  try {
    const spacesClient = spacesService.createSpacesClient(request);
    if (await initialSolutionSetup.isRequired(spacesClient)) {
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
