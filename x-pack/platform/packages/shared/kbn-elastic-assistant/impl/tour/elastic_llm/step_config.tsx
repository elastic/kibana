/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as i18n from './translations';
import { CostAwareness } from './messages';

export const elasticLLMTourStep1 = {
  title: i18n.ELASTIC_LLM_TOUR_TITLE,
  subTitle: i18n.ELASTIC_LLM_TOUR_SUBTITLE,
  content: <CostAwareness />,
};
