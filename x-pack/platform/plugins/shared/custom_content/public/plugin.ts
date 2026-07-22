/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_ENABLED_FLAG_KEY,
} from '../common/constants';
import { setServices } from './services';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class CustomContentPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddablePublicDefinition(CUSTOM_CONTENT_EMBEDDABLE_TYPE, async () => {
      const { customContentEmbeddableFactory } = await import('./async_services');
      return customContentEmbeddableFactory;
    });
  }

  start(core: CoreStart) {
    // Temporary kill-switch — remove once the feature is approved to ship.
    if (!core.featureFlags.getBooleanValue(CUSTOM_CONTENT_ENABLED_FLAG_KEY, false)) return;
    setServices(core);
  }
}
