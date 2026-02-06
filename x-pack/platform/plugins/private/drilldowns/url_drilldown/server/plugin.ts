/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { URL_DRILLDOWN_SUPPORTED_TRIGGERS, URL_DRILLDOWN_TYPE } from '../common/constants';
import { urlDrilldownSchema } from './schemas';

interface SetupDependencies {
  embeddable: EmbeddableSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface StartDependencies {}

export class UrlDrilldownPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup, { embeddable }: SetupDependencies) {
    embeddable.registerDrilldown(URL_DRILLDOWN_TYPE, {
      schema: urlDrilldownSchema,
      supportedTriggers: URL_DRILLDOWN_SUPPORTED_TRIGGERS,
    });
  }

  public start(core: CoreStart) {}
}
