/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillFileEntry, SkillReferencedContentFileEntry } from './types';

export const getSkillEntryPath = ({ skill }: { skill: SkillDefinition }): string => {
  return `${skill.basePath}/${skill.name}/SKILL.md`;
};

export const getSkillReferencedContentEntryPath = ({
  skill,
  referencedContent,
}: {
  skill: SkillDefinition;
  referencedContent: NonNullable<SkillDefinition['referencedContent']>[number];
}): string => {
  return `${skill.basePath}/${skill.name}/${referencedContent.relativePath}/${referencedContent.name}.md`;
};

export const getSkillPlainText = ({ skill }: { skill: SkillDefinition }): string => {
  return `---
name: ${skill.name}
description: ${skill.description}
---

${skill.content}`;
};

export const createSkillEntries = (
  skill: SkillDefinition
): (SkillFileEntry | SkillReferencedContentFileEntry)[] => {
  const stringifiedContent = getSkillPlainText({ skill });

  return [
    {
      type: 'file',
      path: getSkillEntryPath({
        skill,
      }),
      content: {
        raw: {
          body: stringifiedContent,
        },
        plain_text: stringifiedContent,
      },
      metadata: {
        // generic meta
        type: FileEntryType.skill,
        id: skill.id,
        token_count: estimateTokens(stringifiedContent),
        readonly: true,
        // specific tool-result meta
        skill_name: skill.name,
        skill_description: skill.description,
        skill_id: skill.id,
      },
    } satisfies SkillFileEntry,
    ...(skill.referencedContent?.map((referencedContent) => {
      return {
        type: 'file' as const,
        path: getSkillReferencedContentEntryPath({
          skill,
          referencedContent,
        }),
        content: {
          raw: {
            body: referencedContent.content,
          },
          plain_text: referencedContent.content,
        },
        metadata: {
          // generic meta
          type: FileEntryType.skillReferenceContent,
          id: skill.id,
          token_count: estimateTokens(referencedContent.content),
          readonly: true,
          // specific tool-result meta
          skill_id: skill.id,
        },
      } satisfies SkillReferencedContentFileEntry;
    }) ?? []),
  ];
};

export const isSkillFileEntry = (entry: FileEntry): entry is SkillFileEntry => {
  return entry.metadata.type === FileEntryType.skill;
};
