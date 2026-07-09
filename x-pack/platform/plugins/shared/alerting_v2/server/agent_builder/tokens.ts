/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { ServiceIdentifier } from 'inversify';

/**
 * Multi-bound token for Agent Builder attachment type definitions. Each binding
 * produces a definition with its request-scoped client wired via DI; the
 * start-phase handler in `bind_agent_builder` resolves them all and registers
 * them with `agentBuilder.attachments` once the experimental features setting is
 * enabled.
 */
export const AttachmentTypeToken = Symbol.for(
  'alerting_v2.AgentBuilder.AttachmentType'
) as ServiceIdentifier<AttachmentTypeDefinition>;
