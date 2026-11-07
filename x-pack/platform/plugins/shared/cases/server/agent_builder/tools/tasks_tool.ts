/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import {
  getAgentCasesClient,
  toolResult,
  type GetCasesClientWithOptionsFn,
} from '../utils/agent_cases_client';
import { CASES_TOOL_TEXT_INSTRUCTION } from '../utils/tool_instructions';

const MODES = [
  'list',
  'find_task_lists',
  'add_task_list',
  'create_tasks',
  'update_task',
  'complete_task',
  'reorder',
  'run_workflow',
] as const;

const MODE_DESCRIPTION =
  'Required fields per mode:\n' +
  '- list: case_id. Returns the case tasks with status, required, assignees, and workflow.\n' +
  '- find_task_lists: owner (+ optional search). Task lists (task list templates) that can be added to a case.\n' +
  '- add_task_list: case_id, task_list_id. Adds every task of a task list to the case.\n' +
  '- create_tasks: case_id, tasks (array of {title, description?, required?, assignees?}). Writes a task list from scratch.\n' +
  '- update_task: task_id plus any of title, description, status, assignees, required.\n' +
  '- complete_task: task_id. Marks a task done with you as the actor. Refused for a task that names a workflow: run it instead.\n' +
  '- reorder: case_id, task_ids (the full order).\n' +
  "- run_workflow: task_id. Runs the task's workflow and waits up to 20 seconds; the task is done only when the run succeeds.";

const taskInputSchema = lazySchema(() =>
  z.object({
    title: z.string().min(1).max(160),
    description: z.string().max(30000).optional(),
    required: z.boolean().optional(),
    assignees: z.array(z.object({ uid: z.string() })).optional(),
  })
);

const tasksSchema = lazySchema(() =>
  z.object({
    mode: z.enum(MODES).describe(MODE_DESCRIPTION),
    case_id: z.string().optional(),
    task_id: z.string().optional(),
    task_list_id: z.string().optional(),
    owner: z.string().optional(),
    search: z.string().optional(),
    tasks: z.array(taskInputSchema).max(50).optional(),
    task_ids: z.array(z.string()).optional(),
    title: z.string().min(1).max(160).optional(),
    description: z.string().max(30000).optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
    assignees: z.array(z.object({ uid: z.string() })).optional(),
    required: z.boolean().optional(),
  })
);

const need = <T>(value: T | undefined, field: string, mode: string): T => {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    throw Boom.badRequest(`${field} is required for ${mode}`);
  }
  return value;
};

/** What the agent needs to decide what to do next, without the task's bookkeeping fields. */
export const summarizeTask = (task: CaseTask) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  required: task.required,
  assignees: task.assignees,
  parent_task_id: task.parent_task_id,
  workflow_id: task.workflow_id ?? null,
  workflow_run: task.workflow_run ?? null,
  completed_at: task.completed_at,
});

const isFinished = (task: CaseTask) => task.status === 'completed' || task.status === 'cancelled';

export const tasksTool = (
  getCasesClient: GetCasesClientWithOptionsFn
): BuiltinToolDefinition<typeof tasksSchema> => ({
  id: platformCoreCasesTools.tasks,
  type: ToolType.builtin,
  description: `Read, write, and work a case's tasks: list them, add a task list or write one from scratch, edit, assign, reorder, mark required, complete, and run the workflow a person or task list attached to a task (you can't attach one yourself). Every write records you as the actor and runs with the user's permissions. Modes: ${MODES.join(
    ', '
  )}. See \`mode\` for required inputs.\n\n${CASES_TOOL_TEXT_INSTRUCTION}`,
  annotations: {
    title: 'Case tasks',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: tasksSchema,
  tags: ['cases'],
  excludeFromMcp: true,
  handler: async (args, toolContext) => {
    const client = await getAgentCasesClient(getCasesClient, toolContext);
    const { mode } = args;

    switch (mode) {
      case 'list': {
        const { tasks } = await client.tasks.getByCase(need(args.case_id, 'case_id', mode));
        const open = tasks.filter((task) => !isFinished(task));
        return toolResult({
          tasks: tasks.map(summarizeTask),
          open_count: open.length,
          required_open: open
            .filter((task) => task.required)
            .map(({ id, title }) => ({ id, title })),
        });
      }
      case 'find_task_lists': {
        const { templates } = await client.taskTemplates.find({
          owner: need(args.owner, 'owner', mode),
          ...(args.search ? { search: args.search } : {}),
        });
        return toolResult({
          task_lists: templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            tasks: template.tasks.map(({ title, required }) => ({ title, required })),
          })),
        });
      }
      case 'add_task_list': {
        const tasks = await client.tasks.applyTemplate(
          need(args.case_id, 'case_id', mode),
          need(args.task_list_id, 'task_list_id', mode)
        );
        return toolResult({ added: tasks.map(summarizeTask) });
      }
      case 'create_tasks': {
        const caseId = need(args.case_id, 'case_id', mode);
        const created = [];
        for (const task of need(args.tasks, 'tasks', mode)) {
          created.push(await client.tasks.create(caseId, task));
        }
        return toolResult({ created: created.map(summarizeTask) });
      }
      case 'update_task': {
        const taskId = need(args.task_id, 'task_id', mode);
        const current = await client.tasks.get(taskId);
        if (args.status === 'completed' && current.workflow_id) {
          throw Boom.badRequest(
            `Task "${current.title}" runs a workflow. Use run_workflow; it completes when the run succeeds.`
          );
        }
        const updated = await client.tasks.update(taskId, {
          version: current.version,
          ...(args.title !== undefined ? { title: args.title } : {}),
          ...(args.description !== undefined ? { description: args.description } : {}),
          ...(args.status !== undefined ? { status: args.status } : {}),
          ...(args.assignees !== undefined ? { assignees: args.assignees } : {}),
          ...(args.required !== undefined ? { required: args.required } : {}),
        });
        return toolResult({ task: summarizeTask(updated) });
      }
      case 'complete_task': {
        const taskId = need(args.task_id, 'task_id', mode);
        const current = await client.tasks.get(taskId);
        if (current.workflow_id) {
          throw Boom.badRequest(
            `Task "${current.title}" runs a workflow. Use run_workflow; it completes when the run succeeds.`
          );
        }
        const updated = await client.tasks.update(taskId, {
          version: current.version,
          status: 'completed',
        });
        return toolResult({ task: summarizeTask(updated) });
      }
      case 'reorder': {
        await client.tasks.reorder(
          need(args.case_id, 'case_id', mode),
          need(args.task_ids, 'task_ids', mode)
        );
        return toolResult({ reordered: true });
      }
      case 'run_workflow': {
        const task = await client.tasks.runWorkflowAndWait(need(args.task_id, 'task_id', mode));
        return toolResult({
          task: summarizeTask(task),
          outcome: task.workflow_run?.status ?? 'running',
          ...(task.workflow_run?.status === 'running'
            ? { note: 'The run is still going. Check again with list in a moment.' }
            : {}),
        });
      }
      default: {
        const exhaustive: never = mode;
        throw new Error(`Unknown tasks mode: ${exhaustive}`);
      }
    }
  },
});
