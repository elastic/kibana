/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { z } from '@kbn/zod/v4';
import {
  createPublicStepDefinition as createStepDefinition,
  type PublicStepDefinition,
} from '@kbn/workflows-extensions/public';
import { addAttachmentStepCommonDefinition } from '../../common/workflows/steps/attachment_add';
import { updateAttachmentStepCommonDefinition } from '../../common/workflows/steps/attachment_update';
import { deleteAttachmentStepCommonDefinition } from '../../common/workflows/steps/attachment_delete';
import { readAttachmentStepCommonDefinition } from '../../common/workflows/steps/attachment_read';
import { listAttachmentsStepCommonDefinition } from '../../common/workflows/steps/attachment_list';

export const sharedIcon: React.ComponentType = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/product_agent').then(({ icon }) => ({
    default: icon,
  }))
);

function createPublicStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
>(definition: PublicStepDefinition<Input, Output, Config>) {
  return createStepDefinition({
    icon: sharedIcon,
    ...definition,
  });
}

export const addAttachmentStepDefinition = createPublicStepDefinition(
  addAttachmentStepCommonDefinition
);

export const updateAttachmentStepDefinition = createPublicStepDefinition(
  updateAttachmentStepCommonDefinition
);

export const deleteAttachmentStepDefinition = createPublicStepDefinition(
  deleteAttachmentStepCommonDefinition
);

export const readAttachmentStepDefinition = createPublicStepDefinition(
  readAttachmentStepCommonDefinition
);

export const listAttachmentsStepDefinition = createPublicStepDefinition(
  listAttachmentsStepCommonDefinition
);
