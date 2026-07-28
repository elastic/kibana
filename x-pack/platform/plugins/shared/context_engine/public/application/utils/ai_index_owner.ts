/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';

/**
 * Who owns an AI index. Managed entries are registered in code and cannot be
 * edited or deleted through the API.
 */
export type AiIndexOwner = 'managed' | 'user';

export const getAiIndexOwner = ({ managed }: AiIndexHttpItem): AiIndexOwner =>
  managed ? 'managed' : 'user';
