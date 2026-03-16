/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../config';
import { deleteTaskTemplateRoute } from './delete_task_template_route';
import { findTaskTemplatesRoute } from './find_task_templates_route';
import { getTaskTemplateRoute } from './get_task_template_route';
import { patchTaskTemplateRoute } from './patch_task_template_route';
import { postTaskTemplateRoute } from './post_task_template_route';

export const getTaskTemplateRoutes = (config: ConfigType) =>
  config.tasks.enabled
    ? [
        postTaskTemplateRoute,
        findTaskTemplatesRoute,
        getTaskTemplateRoute,
        patchTaskTemplateRoute,
        deleteTaskTemplateRoute,
      ]
    : [];
