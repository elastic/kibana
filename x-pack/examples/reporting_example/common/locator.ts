/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition } from '../../../../src/plugins/share/public';
import { PLUGIN_ID } from '../common';
import type { MyForwardableState } from '../public/types';

export const REPORTING_EXAMPLE_LOCATOR_ID = 'REPORTING_EXAMPLE_LOCATOR_ID';

export type ReportingExampleLocatorParams = SerializableRecord;

export class ReportingExampleLocatorDefinition implements LocatorDefinition<{}> {
  public readonly id = REPORTING_EXAMPLE_LOCATOR_ID;

  migrations = {
    '1.0.0': (state: {}) => ({ ...state, migrated: true }),
  };

  public readonly getLocation = async (params: MyForwardableState) => {
    const path = Boolean(params.captureTest) ? '/captureTest' : '/';
    return {
      app: PLUGIN_ID,
      path,
      state: params,
    };
  };
}
