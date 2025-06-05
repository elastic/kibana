/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Plugin, CoreSetup } from '@kbn/core/server';
import { LensServerPluginSetup } from '@kbn/lens-plugin/server';

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
  public setup(core: CoreSetup, { lens }: Dependencies) {}

  public start() {}
  public stop() {}
}
