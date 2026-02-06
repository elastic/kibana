/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilestoreEntry } from '@kbn/agent-builder-server/runner/filestore';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillFileEntry, SkillFilestoreEntry, SkillReferencedContentFileEntry } from './types';

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

  const skillEntry: SkillFileEntry = {
    type: 'file',
    path: getSkillEntryPath({
      skill,
    }),
    versions: [
      {
        version: 1,
        metadata: { token_count: estimateTokens(stringifiedContent) },
        content: {
          raw: {
            body: stringifiedContent,
          },
          plain_text: stringifiedContent,
        },
      },
    ],
    metadata: {
      // generic meta
      type: FileEntryType.skill,
      id: skill.id,
      readonly: true,
      // specific tool-result meta
      skill_name: skill.name,
      skill_description: skill.description,
      skill_id: skill.id,
    },
  };

  const skillReferenceEntries =
    skill.referencedContent?.map<SkillReferencedContentFileEntry>((referencedContent) => {
      return {
        type: 'file',
        path: getSkillReferencedContentEntryPath({
          skill,
          referencedContent,
        }),
        versions: [
          {
            version: 1,
            metadata: {
              token_count: estimateTokens(referencedContent.content),
            },
            content: {
              raw: {
                body: referencedContent.content,
              },
              plain_text: referencedContent.content,
            },
          },
        ],
        metadata: {
          // generic meta
          type: FileEntryType.skillReferenceContent,
          id: skill.id,
          readonly: true,
          // specific tool-result meta
          skill_id: skill.id,
        },
      };
    }) ?? [];

  return [skillEntry, ...skillReferenceEntries];
};

export const isSkillFilestoreEntry = (entry: FilestoreEntry): entry is SkillFilestoreEntry => {
  return entry.metadata.type === FileEntryType.skill;
};
