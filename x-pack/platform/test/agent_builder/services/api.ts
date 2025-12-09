/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import { oneChatCommonServices } from './common';

/**
 * Onechat API-only services.
 * Composes common deployment-agnostic services and adds any onechat-specific API helpers.
 */
export const oneChatApiServices = {
  ...oneChatCommonServices,
};

export type OneChatApiFtrProviderContext = GenericFtrProviderContext<typeof oneChatApiServices, {}>;
