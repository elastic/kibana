/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as stringifyYaml } from 'yaml';
import { v5 as uuidv5 } from 'uuid';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TASK_TEMPLATE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
} from '../../common/constants';
import type { CaseStatuses, CaseStatusesConfiguration } from '../../common/types/domain';
import type { CaseTaskTemplateAttributes } from '../../common/types/domain/task_template/v1';
import { DEFAULT_CASE_PAUSE_REASONS, getEffectiveStatuses } from '../../common/utils/statuses';
import { SYSTEM_TEMPLATE_ID_PREFIX, isSystemTemplateId } from '../../common/utils/system_templates';
import type { ConfigurationPersistedAttributes } from '../common/types/configure';

export { SYSTEM_TEMPLATE_ID_PREFIX, isSystemTemplateId };

export const SYSTEM_TEMPLATE_AUTHOR = 'Elastic';

export interface SystemTemplateTask {
  title: string;
  description?: string;
  required: boolean;
  workflow_id?: string;
}

export interface SystemTemplateStatus {
  key: string;
  label: string;
  /** A status category (`open`, `in-progress`, `closed`); a plain string so callers need no enum. */
  category: `${CaseStatuses}`;
  pausesTimeTracking: boolean;
}

export interface SystemTemplateDefinition {
  /**
   * Stable across spaces and releases; the template's `templateId` is `system-<id>`, at most 36
   * characters in all.
   */
  id: string;
  name: string;
  description: string;
  tags?: string[];
  taskList: {
    /** Stable task list id. */
    id: string;
    name: string;
    description: string;
    tasks: SystemTemplateTask[];
  };
  /** Statuses the template's cases use; added to the owner's configuration when missing. */
  statuses?: SystemTemplateStatus[];
}

export interface RegisteredSystemTemplate {
  owner: string;
  definition: SystemTemplateDefinition;
}

export class SystemTemplateRegistry {
  private readonly templates = new Map<string, RegisteredSystemTemplate>();

  register(owner: string, definition: SystemTemplateDefinition): void {
    if (getSystemTemplateId(definition).length > MAX_TEMPLATE_ID_LENGTH) {
      throw new Error(`System template id "${definition.id}" is too long`);
    }
    const key = `${owner}:${definition.id}`;
    if (this.templates.has(key)) {
      throw new Error(`System template "${definition.id}" is already registered for ${owner}`);
    }
    this.templates.set(key, { owner, definition });
  }

  list(owner?: string): RegisteredSystemTemplate[] {
    return [...this.templates.values()].filter((t) => owner === undefined || t.owner === owner);
  }
}

const MAX_TEMPLATE_ID_LENGTH = 36;
// Fixed namespace for the saved-object ids below; never change it, or every space gets a copy.
const SYSTEM_TEMPLATE_UUID_NAMESPACE = '6f1b3c2e-6a59-4d0e-9a51-2f7e3b1c8d40';

export const getSystemTemplateId = (definition: SystemTemplateDefinition) =>
  `${SYSTEM_TEMPLATE_ID_PREFIX}${definition.id}`;

/**
 * Task lists and templates are multiple-isolated saved objects, whose ids are unique across all
 * spaces, so each space gets its own id derived from the space and the stable id.
 */
const getSpaceScopedId = (spaceId: string, kind: string, id: string) =>
  uuidv5(`${spaceId}:${kind}:${id}`, SYSTEM_TEMPLATE_UUID_NAMESPACE);

const buildDefinitionYaml = (definition: SystemTemplateDefinition, taskListId: string) =>
  stringifyYaml({
    description: definition.description,
    ...(definition.tags?.length ? { tags: definition.tags } : {}),
    task_lists: [taskListId],
    fields: [],
  });

/** Creates the object; another Kibana or request writing it first counts as created. */
const createIfMissing = async (
  repository: ISavedObjectsRepository,
  type: string,
  attributes: Record<string, unknown>,
  options: { id: string; namespace: string | undefined }
): Promise<boolean> => {
  try {
    await repository.create(type, attributes, { ...options, refresh: true });
    return true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      return false;
    }
    throw error;
  }
};

const exists = async (
  repository: ISavedObjectsRepository,
  type: string,
  id: string,
  namespace: string | undefined
) => {
  try {
    await repository.get(type, id, { namespace });
    return true;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

/** Any version of the template, deleted or not: a template someone turned off stays off. */
const templateExists = async (
  repository: ISavedObjectsRepository,
  templateId: string,
  spaceId: string
) => {
  const { total } = await repository.find({
    type: CASE_TEMPLATE_SAVED_OBJECT,
    namespaces: [spaceId],
    filter: `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateId: "${templateId}"`,
    perPage: 0,
  });
  return total > 0;
};

export interface EnsureSystemTemplatesResult {
  createdTemplates: string[];
  createdTaskLists: string[];
  addedStatuses: string[];
  /** Owners whose statuses were left alone because they have no Cases configuration yet. */
  ownersWithoutConfiguration: string[];
}

/**
 * Writes each registered shipped template into one space with the internal user: its task list,
 * the template itself, and its statuses. Only what is missing is written, so a template someone
 * turned off, or a status someone renamed, is never put back.
 */
export const ensureSystemTemplates = async ({
  repository,
  spaceId,
  templates,
  customStatusesEnabled,
  addStatuses = true,
  logger,
  now = () => new Date().toISOString(),
}: {
  repository: ISavedObjectsRepository;
  spaceId: string;
  templates: RegisteredSystemTemplate[];
  customStatusesEnabled: boolean;
  /**
   * Off when the requester can't change the owner's Cases settings: the template and task list
   * are still written, the statuses wait for the start-time pass or a settings admin.
   */
  addStatuses?: boolean;
  logger: Logger;
  now?: () => string;
}): Promise<EnsureSystemTemplatesResult> => {
  const namespace = spaceIdToNamespace(spaceId);
  const result: EnsureSystemTemplatesResult = {
    createdTemplates: [],
    createdTaskLists: [],
    addedStatuses: [],
    ownersWithoutConfiguration: [],
  };
  const author = { username: SYSTEM_TEMPLATE_AUTHOR, full_name: SYSTEM_TEMPLATE_AUTHOR, email: null };

  for (const { owner, definition } of templates) {
    const taskListId = getSpaceScopedId(spaceId, 'task-list', definition.taskList.id);
    if (!(await exists(repository, CASE_TASK_TEMPLATE_SAVED_OBJECT, taskListId, namespace))) {
      const attributes: CaseTaskTemplateAttributes = {
        name: definition.taskList.name,
        description: definition.taskList.description,
        tags: [],
        tasks: definition.taskList.tasks.map((task) => ({
          title: task.title,
          description: task.description ?? '',
          priority: 'medium',
          required: task.required,
          due_within: null,
          subtasks: [],
          ...(task.workflow_id ? { workflow_id: task.workflow_id } : {}),
        })),
        owner,
        created_at: now(),
        created_by: author,
        updated_at: null,
        updated_by: null,
      };
      if (
        await createIfMissing(
          repository,
          CASE_TASK_TEMPLATE_SAVED_OBJECT,
          attributes as unknown as Record<string, unknown>,
          { id: taskListId, namespace }
        )
      ) {
        result.createdTaskLists.push(taskListId);
      }
    }

    const templateId = getSystemTemplateId(definition);
    if (!(await templateExists(repository, templateId, spaceId))) {
      const created = await createIfMissing(
        repository,
        CASE_TEMPLATE_SAVED_OBJECT,
        {
          templateId,
          templateVersion: 1,
          isLatest: true,
          deletedAt: null,
          definition: buildDefinitionYaml(definition, taskListId),
          name: definition.name,
          owner,
          description: definition.description,
          tags: definition.tags ?? [],
          author: SYSTEM_TEMPLATE_AUTHOR,
          fieldCount: 0,
          fieldDefinitions: [],
          isEnabled: true,
        },
        { id: getSpaceScopedId(spaceId, 'template', templateId), namespace }
      );
      if (created) {
        result.createdTemplates.push(templateId);
      }
    }

    if (!addStatuses || !customStatusesEnabled || !definition.statuses?.length) {
      continue;
    }

    const { saved_objects: configurations } =
      await repository.find<ConfigurationPersistedAttributes>({
        type: CASE_CONFIGURE_SAVED_OBJECT,
        namespaces: [spaceId],
        filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner: "${owner}"`,
        perPage: 1,
      });
    const configuration = configurations[0];
    // Creating a configuration here would mark the owner's Cases settings as saved (connector,
    // closure) on the admin's behalf, so statuses wait until someone saves settings once.
    if (!configuration) {
      result.ownersWithoutConfiguration.push(owner);
      logger.debug(
        `Shipped template ${templateId}: no Cases configuration for ${owner} in space ${spaceId} yet; its statuses are added once one exists.`
      );
      continue;
    }

    // Persisted statuses carry the category as a plain string; same cast as the configure service.
    const current = getEffectiveStatuses(
      configuration.attributes.statuses as CaseStatusesConfiguration | undefined
    );
    const missing = definition.statuses.filter(
      (status) => !current.some(({ key }) => key === status.key)
    );
    if (missing.length === 0) {
      continue;
    }

    const maxOrder = Math.max(...current.map(({ order }) => order));
    const statuses = [
      ...current,
      ...missing.map((status, index) => ({
        key: status.key,
        label: status.label,
        category: status.category as CaseStatuses,
        order: maxOrder + 1 + index,
        isDefault: false,
        disabled: false,
        pausesTimeTracking: status.pausesTimeTracking,
      })),
    ];
    const pauseReasons = configuration.attributes.pauseReasons ?? [];
    await repository.update<ConfigurationPersistedAttributes>(
      CASE_CONFIGURE_SAVED_OBJECT,
      configuration.id,
      {
        statuses,
        // Same rule as the settings page: the first pausing status brings the default reasons,
        // so the reason picker is never empty.
        ...(pauseReasons.length === 0 && statuses.some((s) => s.pausesTimeTracking)
          ? { pauseReasons: [...DEFAULT_CASE_PAUSE_REASONS] }
          : {}),
      },
      { namespace, refresh: true, version: configuration.version }
    );
    result.addedStatuses.push(...missing.map(({ key }) => key));
  }

  return result;
};
