/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TASKS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema, paginationSchema } from '../../../schema';
import {
  CaseTaskAssigneeRt,
  CaseTaskPriorityRt,
  CaseTaskRt,
  CaseTaskStatusRt,
} from '../../domain/task/v1';
import { CaseTaskTemplateTaskRt, CaseTaskTemplateRt } from '../../domain/task_template/v1';

const TitleRt = limitedStringSchema({ fieldName: 'title', min: 1, max: MAX_TITLE_LENGTH });
const DescriptionRt = limitedStringSchema({
  fieldName: 'description',
  min: 0,
  max: MAX_DESCRIPTION_LENGTH,
});
const AssigneesRt = limitedArraySchema({
  codec: CaseTaskAssigneeRt,
  fieldName: 'assignees',
  min: 0,
  max: MAX_ASSIGNEES_PER_CASE,
});

export const TaskCreateRequestRt = rt.intersection([
  rt.strict({ title: TitleRt }),
  rt.exact(
    rt.partial({
      description: DescriptionRt,
      status: CaseTaskStatusRt,
      priority: CaseTaskPriorityRt,
      assignees: AssigneesRt,
      due_date: rt.union([rt.string, rt.null]),
      parent_task_id: rt.union([rt.string, rt.null]),
    })
  ),
]);

export const TaskPatchRequestRt = rt.intersection([
  rt.strict({ version: rt.string }),
  rt.exact(
    rt.partial({
      title: TitleRt,
      description: DescriptionRt,
      status: CaseTaskStatusRt,
      priority: CaseTaskPriorityRt,
      assignees: AssigneesRt,
      due_date: rt.union([rt.string, rt.null]),
    })
  ),
]);

export const TasksFindRequestRt = rt.intersection([
  rt.exact(
    rt.partial({
      status: rt.union([CaseTaskStatusRt, rt.array(CaseTaskStatusRt)]),
      assignees: rt.union([rt.string, rt.array(rt.string)]),
      owner: rt.union([rt.string, rt.array(rt.string)]),
      search: rt.string,
      sortField: rt.keyof({ sort_order: null, created_at: null, due_date: null }),
      sortOrder: rt.keyof({ asc: null, desc: null }),
    })
  ),
  paginationSchema({ maxPerPage: MAX_TASKS_PER_CASE }),
]);

export const TasksReorderRequestRt = rt.strict({
  task_ids: limitedArraySchema({
    codec: rt.string,
    fieldName: 'task_ids',
    min: 1,
    max: MAX_TASKS_PER_CASE,
  }),
});

export const TasksResponseRt = rt.strict({ tasks: rt.array(CaseTaskRt) });
export const TasksFindResponseRt = rt.strict({
  tasks: rt.array(CaseTaskRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

/**
 * Task lists (reusable templates of tasks)
 */
const TemplateTasksRt = limitedArraySchema({
  codec: CaseTaskTemplateTaskRt,
  fieldName: 'tasks',
  min: 1,
  max: MAX_TASKS_PER_CASE,
});

export const TaskTemplateCreateRequestRt = rt.intersection([
  rt.strict({
    name: limitedStringSchema({ fieldName: 'name', min: 1, max: MAX_TITLE_LENGTH }),
    tasks: TemplateTasksRt,
    owner: rt.string,
  }),
  rt.exact(
    rt.partial({
      description: DescriptionRt,
      tags: limitedArraySchema({
        codec: limitedStringSchema({ fieldName: 'tags', min: 1, max: MAX_LENGTH_PER_TAG }),
        fieldName: 'tags',
        min: 0,
        max: MAX_TAGS_PER_CASE,
      }),
    })
  ),
]);

export const TaskTemplatePatchRequestRt = rt.intersection([
  rt.strict({ version: rt.string }),
  rt.exact(
    rt.partial({
      name: limitedStringSchema({ fieldName: 'name', min: 1, max: MAX_TITLE_LENGTH }),
      description: DescriptionRt,
      tags: limitedArraySchema({
        codec: limitedStringSchema({ fieldName: 'tags', min: 1, max: MAX_LENGTH_PER_TAG }),
        fieldName: 'tags',
        min: 0,
        max: MAX_TAGS_PER_CASE,
      }),
      tasks: TemplateTasksRt,
    })
  ),
]);

export const TaskTemplatesFindRequestRt = rt.exact(
  rt.partial({
    owner: rt.union([rt.string, rt.array(rt.string)]),
    tags: rt.union([rt.string, rt.array(rt.string)]),
    search: rt.string,
  })
);

export const TaskTemplatesResponseRt = rt.strict({
  templates: rt.array(CaseTaskTemplateRt),
  total: rt.number,
});

export const ApplyTaskTemplateRequestRt = rt.strict({ template_id: rt.string });

export type TaskCreateRequest = rt.TypeOf<typeof TaskCreateRequestRt>;
export type TaskPatchRequest = rt.TypeOf<typeof TaskPatchRequestRt>;
export type TasksFindRequest = rt.TypeOf<typeof TasksFindRequestRt>;
export type TasksReorderRequest = rt.TypeOf<typeof TasksReorderRequestRt>;
export type TasksResponse = rt.TypeOf<typeof TasksResponseRt>;
export type TasksFindResponse = rt.TypeOf<typeof TasksFindResponseRt>;
export type TaskTemplateCreateRequest = rt.TypeOf<typeof TaskTemplateCreateRequestRt>;
export type TaskTemplatePatchRequest = rt.TypeOf<typeof TaskTemplatePatchRequestRt>;
export type TaskTemplatesFindRequest = rt.TypeOf<typeof TaskTemplatesFindRequestRt>;
export type TaskTemplatesResponse = rt.TypeOf<typeof TaskTemplatesResponseRt>;
export type ApplyTaskTemplateRequest = rt.TypeOf<typeof ApplyTaskTemplateRequestRt>;
