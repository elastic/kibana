/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';

import { transformBuiltInToolToFormData } from '../../../../../utils/transform_built_in_form_data';
import { zodResolver } from '../../../../../utils/zod_resolver';
import type { ToolTypeRegistryEntry } from '../common';
import type { BuiltinToolFormData } from '../../types/tool_form_types';
import { commonToolFormDefaultValues } from '../common';
import { labels } from '../../../../../utils/i18n';

// This is to support displaying form of read-only built-in tools

export const builtinToolRegistryEntry: ToolTypeRegistryEntry<BuiltinToolFormData> = {
  label: labels.tools.builtinLabel,
  getConfigurationComponent: () => {
    throw new Error("Built-in tools don't have a configuration component");
  },
  defaultValues: {
    ...commonToolFormDefaultValues,
    type: ToolType.builtin,
  },
  toolToFormData: transformBuiltInToolToFormData,
  formDataToCreatePayload: () => {
    throw new Error('Built-in tools cannot be created');
  },
  formDataToUpdatePayload: () => {
    throw new Error('Built-in tools cannot be updated');
  },
  getValidationResolver: () => zodResolver(z.any({})),
};
