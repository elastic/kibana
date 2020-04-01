/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaContextProvider,
  KibanaReactContextValue,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
} from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../plugin';

export type KibanaContext = KibanaReactContextValue<StartServices>;
export interface WithKibanaProps {
  kibana: KibanaContext;
}

// eslint-disable-next-line react-hooks/rules-of-hooks
const typedUseKibana = () => useKibana<StartServices>();

export {
  KibanaContextProvider,
  typedUseKibana as useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
};
