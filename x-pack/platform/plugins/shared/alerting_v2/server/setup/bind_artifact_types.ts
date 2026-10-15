/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnSetup } from '@kbn/core-di';
import type { ContainerModuleLoadOptions } from 'inversify';
import { ArtifactTypeRegistry, registerBuiltinArtifactTypes } from '../lib/artifact_types';

/**
 * Registers RnA-owned built-in artifact types (runbook, dashboard) during setup.
 * Solution plugins register their own types via `AlertingServerSetup.registerArtifactType`.
 */
export function bindArtifactTypes({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    registerBuiltinArtifactTypes(container.get(ArtifactTypeRegistry));
  });
}
