/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Plugin, CoreSetup } from '@kbn/core/server';
import { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { DEFAULT_COLOR } from '../common/constants';
import { RotatingNumberState as Post81RotatingNumberState } from '../common/types';

// Old versions of this visualization had a slightly different shape of state
interface Pre81RotatingNumberState {
  column?: string;
  layerId: string;
}

// this plugin's dependencies
export interface Dependencies {
  lens: LensServerPluginSetup;
}

export class ThirdPartyVisLensExamplePlugin implements Plugin<void, void, Dependencies> {
  public setup(core: CoreSetup, { lens }: Dependencies) {
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

  public start() {}
  public stop() {}
}
