/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { webCrawlStepCommonDefinition } from '../common/web_crawl_step';

export const webCrawlStepDefinition: PublicStepDefinition = {
  ...webCrawlStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/globe').then(({ icon }) => ({ default: icon }))
  ),
};
