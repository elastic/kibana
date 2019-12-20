/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { FeatureCatalogueCategory } from '../../../../../src/plugins/home/public';

const APP_ID = 'siem';

// TODO(rylnd): move this into Plugin.setup once we're on NP
npSetup.plugins.home.featureCatalogue.register({
  id: APP_ID,
  title: 'SIEM',
  description: 'Explore security metrics and logs for events and alerts',
  icon: 'securityAnalyticsApp',
  path: `/app/${APP_ID}`,
  showOnHomePage: true,
  category: FeatureCatalogueCategory.DATA,
});
