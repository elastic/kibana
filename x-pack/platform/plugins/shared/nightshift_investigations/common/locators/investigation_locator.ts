/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

export const NIGHTSHIFT_INVESTIGATION_LOCATOR_ID = 'NIGHTSHIFT_INVESTIGATION_LOCATOR';

export interface InvestigationLocatorParams extends SerializableRecord {
  investigationId: string;
}

export type InvestigationLocator = LocatorPublic<InvestigationLocatorParams>;

export class InvestigationLocatorDefinition
  implements LocatorDefinition<InvestigationLocatorParams>
{
  public readonly id = NIGHTSHIFT_INVESTIGATION_LOCATOR_ID;

  public readonly getLocation = async (params: InvestigationLocatorParams) => {
    return {
      app: NIGHTSHIFT_APP_ID,
      path: `?investigationId=${encodeURIComponent(params.investigationId)}`,
      state: {},
    };
  };
}
