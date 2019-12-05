/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultHeaders } from './default_headers';
import { SubsetTimelineModel, timelineDefaults } from '../../store/timeline/model';

export const eventsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: defaultHeaders,
};
