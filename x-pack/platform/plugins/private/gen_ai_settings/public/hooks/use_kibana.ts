/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import {
  useKibana as useKibanaBase,
  type KibanaReactContextValue,
} from '@kbn/kibana-react-plugin/public';
import type { GenAiSettingsStartDeps } from '../plugin';

export type StartServices = CoreStart & GenAiSettingsStartDeps;

export const useKibana = () => useKibanaBase<StartServices>();

export type GenAiSettingsKibanaReactContextValue = KibanaReactContextValue<StartServices>;
