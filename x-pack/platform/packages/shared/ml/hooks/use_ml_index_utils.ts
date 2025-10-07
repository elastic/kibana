/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexServiceFactory } from '@kbn/ml-services/index_service';
import { useMlKibana } from '@kbn/ml-kibana-context';

export const useMlIndexUtils = () => indexServiceFactory(useMlKibana().services.data.dataViews);
