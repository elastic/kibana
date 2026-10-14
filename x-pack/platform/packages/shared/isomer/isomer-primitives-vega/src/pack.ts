/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  definePrimitivePack,
  type EnhancementDefinition,
  type PrimitiveNode,
  someBodyNode,
} from '@elastic/isomer-sdk';

import { createVegaPrimitive, VEGA_INTERACTIVE, type VegaPrimitiveOptions } from './primitive';

/**
 * Embeds each chart's compiled spec beside its SVG so `hydrateVega` from
 * `./client` can make it live. Host-driven: it ships no script.
 */
export const vegaInteractiveEnhancement: EnhancementDefinition = {
  id: VEGA_INTERACTIVE,
  appliesTo: (body, walk) =>
    someBodyNode(body, 'react', (node) => (node as PrimitiveNode).type === 'vega', walk),
};

/** A pack holding one `vega` primitive drawn with `options`' themes. */
export const createVegaPack = (options: VegaPrimitiveOptions = {}) =>
  definePrimitivePack({
    id: 'vega',
    primitives: [createVegaPrimitive(options)],
    enhancements: [vegaInteractiveEnhancement],
    slackAssetTypes: ['vega'],
  });

/** {@link createVegaPack} with the default themes. */
export const vegaPack = createVegaPack();
