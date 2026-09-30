/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { customContentEmbeddableSchema } from './embeddable/schemas';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class CustomContentPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddableServerDefinition(CUSTOM_CONTENT_EMBEDDABLE_TYPE, {
      title: 'Custom panel',
      getSchema: () => customContentEmbeddableSchema,
    });
  }

  start() {}
}
