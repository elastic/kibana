/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { AlertingV2EpisodesLocatorParams } from '../../../common/locators';

/** Alerting v2 locators registered on the server share service. */
export interface AlertingV2ServerLocators {
  episodesLocators: LocatorPublic<AlertingV2EpisodesLocatorParams>;
}

export const AlertingV2LocatorsToken =
  createToken<AlertingV2ServerLocators>('alerting_v2.Locators');

/** Absolute Kibana URL used to make locator links absolute. */
export const KibanaBaseUrlToken = createToken<string>('alerting_v2.KibanaBaseUrl');
