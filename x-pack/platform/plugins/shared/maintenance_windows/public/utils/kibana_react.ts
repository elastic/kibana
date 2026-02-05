/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana, useUiSetting } from '@kbn/kibana-react-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { MaintenanceWindowsPublicStartDependencies } from '../types';

export type StartServices<AdditionalServices extends object = {}> = CoreStart &
  MaintenanceWindowsPublicStartDependencies &
  AdditionalServices & {
    storage: Storage;
  };
const useTypedKibana = <AdditionalServices extends object = {}>() =>
  useKibana<StartServices<AdditionalServices>>();

export { useTypedKibana as useKibana, useUiSetting };
