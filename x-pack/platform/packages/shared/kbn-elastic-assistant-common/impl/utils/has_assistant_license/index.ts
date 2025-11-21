/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';

const MINIMUM_AI_ASSISTANT_LICENSE = 'enterprise' as const;

export const hasAIAssistantLicense = (license: ILicense): boolean =>
  license.hasAtLeast(MINIMUM_AI_ASSISTANT_LICENSE);
