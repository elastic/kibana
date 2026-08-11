/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { DslStepsFlyoutFormInternal } from './types';

/**
 * Minimal schema for the DSL steps flyout.
 *
 * This flyout uses `UseArray` for `_meta.downsampleSteps[]` and provides most
 * field config (defaults/validations) directly on the `<UseField />` components.
 */
export const getDslStepsFlyoutFormSchema = (): FormSchema<DslStepsFlyoutFormInternal> => ({
  _meta: {
    downsampleSteps: {},
  },
});
