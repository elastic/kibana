/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ResolverTypeDefinition } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ValidateAttachmentResult } from './validate_attachment';

export interface AttachmentServiceStart {
  validate<Type extends string, Data>(
    attachment: AttachmentInput<Type, Data>,
    request: KibanaRequest
  ): Promise<ValidateAttachmentResult<Type, Data>>;
  getTypeDefinition(type: string): ResolverTypeDefinition | undefined;
  getRegisteredTypeIds(): string[];
}
