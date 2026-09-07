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
import { getConversationMetadataStepCommonDefinition } from '../../common/workflows/steps/get_conversation_metadata';
import { updateConversationMetadataStepCommonDefinition } from '../../common/workflows/steps/update_conversation_metadata';

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

export const getConversationMetadataStepDefinition = createPublicStepDefinition(
  getConversationMetadataStepCommonDefinition
);

export const updateConversationMetadataStepDefinition = createPublicStepDefinition(
  updateConversationMetadataStepCommonDefinition
);
