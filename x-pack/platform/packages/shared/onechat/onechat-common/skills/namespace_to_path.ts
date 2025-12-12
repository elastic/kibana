/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from './types/skill';

/**
 * Converts a skill namespace to a filesystem path.
 *
 * Pattern: namespace is split by '.', first part becomes the top-level directory,
 * remaining parts form nested directories, with the last part becoming the filename.
 *
 * Examples:
 * - 'security.get_alerts' → '/skills/security/get_alerts.md'
 * - 'security.cases.note.add_note' → '/skills/security/cases/note/add_note.md'
 * - 'platform.core.search' → '/skills/platform/core/search.md'
 *
 * @param skill - The skill with a namespace property
 * @returns The filesystem path for the skill
 */
export function getSkillFilePath(skill: Skill): string {
  const parts = skill.namespace.split('.');

  if (parts.length < 2) {
    throw new Error(
      `Skill namespace must contain at least one dot separator. ` +
        `Got: "${skill.namespace}". Expected format: "category.skill_name" or "category.subcategory.skill_name"`
    );
  }

  // First part is the top-level directory
  const topLevelDir = parts[0];

  // Remaining parts form nested directories + filename
  // Last part becomes the filename, everything else becomes nested directories
  const nestedParts = parts.slice(1);
  const filename = nestedParts[nestedParts.length - 1];
  const nestedDirs = nestedParts.slice(0, -1);

  // Build the path: /skills/{topLevel}/{nested}/{filename}.md
  const pathParts = ['skills', topLevelDir, ...nestedDirs, `${filename}.md`];

  return `/${pathParts.join('/')}`;
}


