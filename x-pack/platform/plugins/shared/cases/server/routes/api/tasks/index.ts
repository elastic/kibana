/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../config';
import { applyTaskTemplateRoute } from './apply_template_route';
import { deleteTaskCommentRoute } from './delete_task_comment_route';
import { deleteTaskRoute } from './delete_task_route';
import { findTasksRoute } from './find_tasks_route';
import { getCaseTasksRoute } from './get_case_tasks_route';
import { getTaskCommentsRoute } from './get_task_comments_route';
import { getTaskRoute } from './get_task_route';
import { patchTaskRoute } from './patch_task_route';
import { postTaskCommentRoute } from './post_task_comment_route';
import { postTaskRoute } from './post_task_route';
import { reorderTasksRoute } from './reorder_tasks_route';

export const getTaskRoutes = (config: ConfigType) =>
  config.tasks.enabled
    ? [
        postTaskRoute,
        getCaseTasksRoute,
        findTasksRoute,
        getTaskRoute,
        patchTaskRoute,
        deleteTaskRoute,
        reorderTasksRoute,
        applyTaskTemplateRoute,
        getTaskCommentsRoute,
        postTaskCommentRoute,
        deleteTaskCommentRoute,
      ]
    : [];
