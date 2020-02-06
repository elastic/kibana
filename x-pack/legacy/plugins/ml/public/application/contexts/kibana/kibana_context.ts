/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';
import {
  useKibana,
  KibanaReactContextValue,
} from '../../../../../../../../src/plugins/kibana_react/public';

interface StartPlugins {
  data: DataPublicPluginStart;
}
export type StartServices = CoreStart & StartPlugins;
// eslint-disable-next-line react-hooks/rules-of-hooks
export const useMlKibana = () => useKibana<StartServices>();
export type MlKibanaReactContextValue = KibanaReactContextValue<StartServices>;
