/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { z } from '@kbn/zod/v4';
import type { SkillFormData } from './skill_form_validation';

interface UseSkillBrowserApiToolsOptions {
  form: UseFormReturn<SkillFormData>;
  isReadonly: boolean;
  onNavigateToCreate?: (data: { name: string; description: string; content: string }) => void;
}

export const useSkillBrowserApiTools = ({
  form,
  isReadonly,
  onNavigateToCreate,
}: UseSkillBrowserApiToolsOptions): Array<BrowserApiToolDefinition<any>> => {
  const handleUpdateName = useCallback(
    (params: { name: string }) => {
      form.setValue('name', params.name, { shouldDirty: true });
    },
    [form]
  );

  const handleUpdateDescription = useCallback(
    (params: { description: string }) => {
      form.setValue('description', params.description, { shouldDirty: true });
    },
    [form]
  );

  const handleUpdateContent = useCallback(
    (params: { content: string }) => {
      form.setValue('content', params.content, { shouldDirty: true });
    },
    [form]
  );

  const handleUpdateToolIds = useCallback(
    (params: { tool_ids: string[] }) => {
      form.setValue('tool_ids', params.tool_ids, { shouldDirty: true });
    },
    [form]
  );

  const handleUpdateAll = useCallback(
    (params: { name: string; description: string; content: string }) => {
      if (isReadonly && onNavigateToCreate) {
        onNavigateToCreate({
          name: params.name,
          description: params.description,
          content: params.content,
        });
        return;
      }
      form.setValue('name', params.name, { shouldDirty: true });
      form.setValue('description', params.description, { shouldDirty: true });
      form.setValue('content', params.content, { shouldDirty: true });
    },
    [form, isReadonly, onNavigateToCreate]
  );

  return useMemo(() => {
    // For readonly (builtin) skills, only expose skill_update_all which has the
    // navigate-to-create fallback. Individual field tools would silently no-op
    // since the form is readonly, and the LLM wouldn't know the operation failed.
    if (isReadonly) {
      return [
        {
          id: 'skill_update_all',
          description:
            'Update the entire skill (name, description, and content). This is a built-in skill — accepting will create a new user skill with these changes.',
          schema: z.object({
            name: z.string().describe('The skill name'),
            description: z.string().describe('The skill description'),
            content: z.string().describe('The full skill markdown content'),
          }),
          handler: handleUpdateAll,
        },
      ];
    }

    return [
      {
        id: 'skill_update_name',
        description: 'Update the skill name field.',
        schema: z.object({
          name: z.string().describe('The new skill name'),
        }),
        handler: handleUpdateName,
      },
      {
        id: 'skill_update_description',
        description: 'Update the skill description field.',
        schema: z.object({
          description: z.string().describe('The new skill description'),
        }),
        handler: handleUpdateDescription,
      },
      {
        id: 'skill_update_content',
        description: 'Update the skill instructions markdown content.',
        schema: z.object({
          content: z.string().describe('The full updated skill markdown content'),
        }),
        handler: handleUpdateContent,
      },
      {
        id: 'skill_update_tool_ids',
        description:
          'Update the associated tool IDs for this skill. Tools must be valid tool IDs from the registry.',
        schema: z.object({
          tool_ids: z
            .array(z.string())
            .describe('The list of tool IDs to associate with the skill'),
        }),
        handler: handleUpdateToolIds,
      },
      {
        id: 'skill_update_all',
        description: 'Update the entire skill at once: name, description, and content.',
        schema: z.object({
          name: z.string().describe('The skill name'),
          description: z.string().describe('The skill description'),
          content: z.string().describe('The full skill markdown content'),
        }),
        handler: handleUpdateAll,
      },
    ];
  }, [
    isReadonly,
    handleUpdateName,
    handleUpdateDescription,
    handleUpdateContent,
    handleUpdateToolIds,
    handleUpdateAll,
  ]);
};
