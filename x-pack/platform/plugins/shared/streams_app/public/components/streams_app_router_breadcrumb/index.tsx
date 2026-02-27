/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouterBreadcrumbComponent } from '@kbn/typed-react-router-config';
import type { StreamsAppRoutes } from '../../routes/config';

export const StreamsAppRouterBreadcrumb = createRouterBreadcrumbComponent<StreamsAppRoutes>();
