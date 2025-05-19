/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalServices, InternalSetupServices, InternalStartServices } from './types';
import { ToolsService } from './tools';

export const createServices = (): InternalServices => {
  const toolsService = new ToolsService();

  return {
    tools: toolsService,
  };
};

export const setupServices = ({
  services,
}: {
  services: InternalServices;
}): InternalSetupServices => {
  const toolsSetup = services.tools.setup();

  return {
    tools: toolsSetup,
  };
};

export const startServices = ({
  services,
}: {
  services: InternalServices;
}): InternalStartServices => {
  const toolsStart = services.tools.start();

  return {
    tools: toolsStart,
  };
};
