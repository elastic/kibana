/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import type { pageObjects } from '../../functional/page_objects';
import { services as deploymentAgnosticFunctionalServices } from '../../serverless/functional/services/deployment_agnostic_services';
import { agentBuilderCommonServices } from './common';

/**
 * AgentBuilder UI-only services.
 * Composes common services and functional/UI-specific services needed by agentBuilder functional tests.
 */
export const agentBuilderFunctionalServices = {
  ...agentBuilderCommonServices,
  ...deploymentAgnosticFunctionalServices,
};

export type AgentBuilderUiFtrProviderContext = GenericFtrProviderContext<
  typeof agentBuilderFunctionalServices,
  typeof pageObjects
>;
