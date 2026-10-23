/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { AlertingV2EpisodesLocatorDefinition } from '../../../common/locators';
import type { AlertingV2ServerLocators } from './tokens';

export const MOCK_KIBANA_BASE_URL = 'https://kibana.example.com';

export const createAlertingV2LocatorsMock = (): AlertingV2ServerLocators => ({
  episodesLocators: new MockUrlService().locators.create(AlertingV2EpisodesLocatorDefinition),
});
