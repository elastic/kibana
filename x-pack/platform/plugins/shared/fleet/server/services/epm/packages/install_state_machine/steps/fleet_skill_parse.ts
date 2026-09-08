/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election: the "Elastic License 2.0", the
 * "GNU Affero General Public License v3.0 only", and the "Server Side Public
 * License, v 1"; you may not use this file except in compliance with, at your
 * election, the "Elastic License 2.0", the "GNU Affero General Public License
 * v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistedSkillCreateRequest } from '@kbn/agent-builder-common';

/**
 * AB-005: parse a Fleet skill asset (kibana/skill/<path>/<name>/SKILL.md)
 * into a persisted-skill create request, stamped as package-managed.
 */
export interface FleetSkillAsset {
  fileName: string; // e.g. "sdlc-triage/SKILL.md"
  content: string; // raw SKILL.md markdown
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Minimal YAML flat-key parser for skill frontmatter (key: value lines). */
export function parseFrontmatter(content: string): Record<string, string> {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

export function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_RE, '').trim();
}

/**
 * Build a deterministic fleet skill id from package name, space, and skill dir.
 */
export function getFleetPackageSkillId(params: {
  pkgName: string;
  spaceId: string;
  fileName: string; // "sdlc-triage/SKILL.md"
}): string {
  const base = params.fileName.replace(/\/SKILL\.md$/i, '');
  return `fleet-${params.spaceId}-${params.pkgName}-${base}`;
}

/**
 * Parse a SKILL.md asset into a PersistedSkillCreateRequest.
 * Requires frontmatter `name` and `description`; content is the body.
 */
export function parseFleetSkillYaml(
  asset: FleetSkillAsset,
  skillId: string,
  pkgName: string
): PersistedSkillCreateRequest {
  const fm = parseFrontmatter(asset.content);
  const name = fm.name || asset.fileName.split('/')[0];
  const description = fm.description || `Skill ${name} from package ${pkgName}`;
  const skillContent = stripFrontmatter(asset.content);
  if (!skillContent) {
    throw new Error(`Fleet skill asset ${asset.fileName} has empty content after frontmatter`);
  }
  return {
    id: skillId,
    name,
    base_path: fm.base_path || `skills/${pkgName}`,
    description,
    content: skillContent,
    tool_ids: [],
    plugin_id: fm.plugin_id || `fleet:${pkgName}`,
    readonly: true,
  } as PersistedSkillCreateRequest;
}
