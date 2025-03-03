/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from '@kbn/core/public';
import type {
  CustomBrandingPublicSetup,
  CustomBrandingPublicStart,
  CustomBrandingPublicSetupDependencies,
  CustomBrandingPublicStartDependencies,
} from './types';

export class CustomBrandingPlugin
  implements
    Plugin<
      CustomBrandingPublicSetup,
      CustomBrandingPublicStart,
      CustomBrandingPublicSetupDependencies,
      CustomBrandingPublicStartDependencies
    >
{
  public setup(): CustomBrandingPublicSetup {
    return {};
  }

  public start(): CustomBrandingPublicStart {
    return {};
  }

  public stop() {}
}
