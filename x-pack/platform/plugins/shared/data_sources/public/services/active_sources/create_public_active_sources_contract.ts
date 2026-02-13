/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveSourcesServiceStartContract } from '../../types';
import type { ActiveSourcesService } from './active_sources_service';

export const createPublicActiveSourcesContract = ({
  activeSourcesService,
}: {
  activeSourcesService: ActiveSourcesService;
}): ActiveSourcesServiceStartContract => {
  return {
    list: async () => {
      return activeSourcesService.list();
    },
  };
};
