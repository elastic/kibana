/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import {
  KibanaContextProvider,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
} from '@kbn/kibana-react-plugin/public';
import type { UnifiedRulesServices } from '../../../types';

export type KibanaContext = KibanaReactContextValue<UnifiedRulesServices>;
export interface WithKibanaProps {
  kibana: KibanaContext;
}

const useTypedKibana = () => {
  return useKibana<UnifiedRulesServices>();
};

export {
  KibanaContextProvider,
  useTypedKibana as useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
};
