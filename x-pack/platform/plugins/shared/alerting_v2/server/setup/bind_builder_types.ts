/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnSetup } from '@kbn/core-di';
import type { ContainerModuleLoadOptions } from 'inversify';
import { BuilderTypeRegistry, registerBuiltinBuilderTypes } from '../lib/builder_types';

/**
 * Registers the built-in threshold and sequence builders during setup.
 * Solution plugins register their own types via `AlertingServerSetup.registerBuilderType`.
 */
export function bindBuilderTypes({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    registerBuiltinBuilderTypes(container.get(BuilderTypeRegistry));
  });
}
