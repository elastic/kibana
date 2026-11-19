/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { VECTOR_PROJECTION_EMBEDDABLE_TYPE } from '../common/constants';
import { transformIn, transformOut } from '../common/transforms';
import { vectorProjectionEmbeddableSchema } from './schema';

interface SetupDeps {
  embeddable: EmbeddableSetup;
}

export class VectorProjectionPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { embeddable }: SetupDeps) {
    embeddable.registerEmbeddableServerDefinition(VECTOR_PROJECTION_EMBEDDABLE_TYPE, {
      title: 'Vector projection',
      getSchema: () => vectorProjectionEmbeddableSchema,
      getTransforms: () => ({ transformIn, transformOut }),
    });
  }

  start() {}
}
