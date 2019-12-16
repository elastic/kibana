/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaContextProvider,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
} from '../../../../../../../src/plugins/kibana_react/public';
import { StartCore, StartPlugins } from '../../apps/plugin';

export interface WithKibanaProps {
  kibana: { services: StartCore & StartPlugins };
}

export { KibanaContextProvider, useKibana, useUiSetting, useUiSetting$, withKibana };
