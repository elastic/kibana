/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import { AccessUserActionPayloadSchema } from '../access/v1';
import { AiVerdictUserActionPayloadSchema } from '../verdict/v1';
import { CaseSourceSchema } from '../../case/v1';
import { AssigneesUserActionPayloadSchema } from '../assignees/v1';
import { CategoryUserActionPayloadSchema } from '../category/v1';
import {
  ConnectorUserActionPayloadSchema,
  ConnectorUserActionPayloadWithoutConnectorIdSchema,
} from '../connector/v1';
import { CustomFieldsUserActionPayloadSchema } from '../custom_fields/v1';
import { DescriptionUserActionPayloadSchema } from '../description/v1';
import { SettingsUserActionPayloadSchema } from '../settings/v1';
import { TagsUserActionPayloadSchema } from '../tags/v1';
import { TitleUserActionPayloadSchema } from '../title/v1';

const CommonPayloadAttributesSchema = lazySchema(() =>
  z.object({
    assignees: AssigneesUserActionPayloadSchema.shape.assignees,
    description: DescriptionUserActionPayloadSchema.shape.description,
    status: z.string(),
    severity: z.string(),
    tags: TagsUserActionPayloadSchema.shape.tags,
    title: TitleUserActionPayloadSchema.shape.title,
    settings: SettingsUserActionPayloadSchema.shape.settings,
    owner: z.string(),
    category: CategoryUserActionPayloadSchema.shape.category.optional(),
    customFields: CustomFieldsUserActionPayloadSchema.shape.customFields.optional(),
    access: AccessUserActionPayloadSchema.shape.access.optional(),
    source: CaseSourceSchema.optional(),
    ai_verdict: AiVerdictUserActionPayloadSchema.shape.ai_verdict.optional(),
  })
);

export const CreateCaseUserActionSchema = z.object({
  type: z.literal(UserActionTypes.create_case),
  payload: ConnectorUserActionPayloadSchema.merge(CommonPayloadAttributesSchema),
});

export const CreateCaseUserActionWithoutConnectorIdSchema = z.object({
  type: z.literal(UserActionTypes.create_case),
  payload: ConnectorUserActionPayloadWithoutConnectorIdSchema.merge(CommonPayloadAttributesSchema),
});
