/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundOptions, UnboundOptions } from '../bind/bind_api';
import type { ChatCompleteOptions, ChatCompleteAPIResponse } from './api';

/**
 * Options used to call the {@link BoundChatCompleteAPI}
 */
export type UnboundChatCompleteOptions = UnboundOptions<ChatCompleteOptions>;

/**
 * Version of {@link ChatCompleteAPI} that got pre-bound to a set of static parameters
 */
export type BoundChatCompleteAPI = <TChatCompleteOptions extends UnboundChatCompleteOptions>(
  options: TChatCompleteOptions
) => ChatCompleteAPIResponse<TChatCompleteOptions & BoundOptions>;
