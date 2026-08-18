/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { DEFAULT_COLOR } from '../common/constants';
import type { RotatingNumberState as Post81RotatingNumberState } from '../common/types';

interface Pre81RotatingNumberState {
  column?: string;
  layerId: string;
}

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ThirdPartyVisLensExamplePlugin extends Service {
  static readonly inject = ['lens.setup'];
  static readonly provide = 'thirdPartyVisLensExample';

  constructor(ctx: Context) {
    super(ctx, 'thirdPartyVisLensExample');
    const lens = (ctx.get('lens.setup') as any).contract;
    lens.registerVisualizationMigration('rotatingNumber', () => ({
          // Example state migration which will be picked by all the places Lens visualizations are stored
          '8.1.0': (oldState: Pre81RotatingNumberState): Post81RotatingNumberState => {
            return {
              // column gets renamed to accessor
              accessor: oldState.column,
              // layer id just gets copied over
              layerId: oldState.layerId,
              // color gets pre-set with default color
              color: DEFAULT_COLOR,
            };
          },
        }));
  }
}
