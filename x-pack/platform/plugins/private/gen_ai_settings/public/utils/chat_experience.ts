/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';

export const isAIChatExperience = (value: unknown): value is AIChatExperience =>
  typeof value === 'string' &&
  (value === AIChatExperience.Classic || value === AIChatExperience.Agent);
