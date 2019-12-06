/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { signalsHeaders } from './default_headers';
import { SubsetTimelineModel, timelineDefaults } from '../../../store/timeline/model';

export const signalsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: signalsHeaders,
};
