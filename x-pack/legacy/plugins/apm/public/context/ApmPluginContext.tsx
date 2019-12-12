/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, PackageInfo } from 'kibana/public';
import { createContext } from 'react';
import { ApmPluginStartDeps, ConfigSchema } from '../new-platform/plugin';

export interface ApmPluginContextValue {
  config: ConfigSchema;
  core: CoreStart;
  packageInfo: PackageInfo;
  plugins: ApmPluginStartDeps;
}

export const ApmPluginContext = createContext({} as ApmPluginContextValue);
