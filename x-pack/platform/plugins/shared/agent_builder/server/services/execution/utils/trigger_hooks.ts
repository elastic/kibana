/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldInvokeAgentForCollaborativeMessage } from '@kbn/agent-builder-common';

/** POC: invoke agent when collaborative message contains `@agent`. */
export const shouldInvokeAgentForMessage = shouldInvokeAgentForCollaborativeMessage;
