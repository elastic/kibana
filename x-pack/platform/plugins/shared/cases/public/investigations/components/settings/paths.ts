/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Paths inside the Investigations app for the settings page and its template screens. */
export const SETTINGS_PATH = '/settings';
export const TEMPLATES_PATH = `${SETTINGS_PATH}/templates`;
export const NEW_TEMPLATE_PATH = `${TEMPLATES_PATH}/new`;
export const TEMPLATE_PATH_PATTERN = `${TEMPLATES_PATH}/:templateId`;
export const TASK_LISTS_PATH = `${SETTINGS_PATH}/task-lists`;
export const NEW_TASK_LIST_PATH = `${TASK_LISTS_PATH}/new`;
export const TASK_LIST_PATH_PATTERN = `${TASK_LISTS_PATH}/:taskListId`;

export const getTemplatePath = (templateId: string): string =>
  `${TEMPLATES_PATH}/${encodeURIComponent(templateId)}`;

export const getTaskListPath = (taskListId: string): string =>
  `${TASK_LISTS_PATH}/${encodeURIComponent(taskListId)}`;
