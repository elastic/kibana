/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SIG_EVENTS_TOOL_IDS } from '../tools';

export const SIG_EVENTS_SKILL_ID = 'sig-events';

/** Human-readable tool name for skill content. */
const TOOL_ID_TO_NAME: Record<string, string> = {
  [SIG_EVENTS_TOOL_IDS.listStreams]: 'list_streams — list all streams the user has access to.',
  [SIG_EVENTS_TOOL_IDS.listFeatures]:
    'list_features — list features (globally or filtered by stream names).',
  [SIG_EVENTS_TOOL_IDS.listQueries]:
    'list_queries — list significant-events queries (globally or filtered by stream names).',
  [SIG_EVENTS_TOOL_IDS.listSignificantEvents]:
    'list_significant_events — list significant events with optional time range and stream filter.',
  [SIG_EVENTS_TOOL_IDS.listDiscoveries]:
    'list_discoveries — list Discoveries/insights (globally or by impacted stream).',
};

/** All Sig Events tool IDs that this skill can expose. */
export const SIG_EVENTS_SKILL_REGISTRY_TOOL_IDS: readonly string[] = [
  SIG_EVENTS_TOOL_IDS.listStreams,
  SIG_EVENTS_TOOL_IDS.listFeatures,
  SIG_EVENTS_TOOL_IDS.listQueries,
  SIG_EVENTS_TOOL_IDS.listSignificantEvents,
  SIG_EVENTS_TOOL_IDS.listDiscoveries,
];

const allowedSet = new Set(SIG_EVENTS_SKILL_REGISTRY_TOOL_IDS);

/** Default skill content (markdown) when all tools are used. Can be overridden when enabling the skill. */
export const DEFAULT_SIG_EVENTS_SKILL_CONTENT = `# Significant Events (SigEvents) Skill

## Overview

Use this skill when the user asks about Streams or significant events in their stream data in Elasticsearch/Streams. This skill has access only to Streams tools for listing streams, features, queries, significant events, and discoveries.

## When to Use

- User asks about streams or significant events in a stream.
- User wants to list or explore streams, features, queries, significant events, or discoveries.
- User mentions "sig events", "significant events", or "Streams" in this context.

## Available Tools

- \`list_streams\` — list all streams the user has access to.
- \`list_features\` — list features (globally or filtered by stream names).
- \`list_queries\` — list significant-events queries (globally or filtered by stream names).
- \`list_significant_events\` — list significant events with optional time range and stream filter.
- \`list_discoveries\` — list Discoveries/insights (globally or by impacted stream).

## Process

1. Use \`list_streams\` to discover stream names when the user refers to "my stream" or "streams".
2. Use \`list_features\`, \`list_queries\`, \`list_significant_events\`, or \`list_discoveries\` with optional \`stream_names\` to scope results.
3. Direct users to the Streams UI for full management and visualization when appropriate.
`;

/** Builds skill content (markdown) listing only the given tool IDs in "Available Tools". */
function buildSkillContentForToolIds(toolIds: string[]): string {
  const availableToolsBullets = toolIds
    .map((id) => TOOL_ID_TO_NAME[id])
    .filter(Boolean)
    .map((desc) => {
      const [name, rest] = desc.split(' — ');
      return `- \`${name}\` — ${rest ?? ''}`;
    });
  return `# Significant Events (SigEvents) Skill

## Overview

Use this skill when the user asks about Streams or significant events in their stream data in Elasticsearch/Streams.

## When to Use

- User asks about streams or significant events in a stream.
- User wants to list or explore streams, features, queries, significant events, or discoveries.
- User mentions "sig events", "significant events", or "Streams" in this context.

## Available Tools

${availableToolsBullets.join('\n')}

## Process

1. Use \`list_streams\` to discover stream names when the user refers to "my stream" or "streams".
2. Use the available tools with optional \`stream_names\` to scope results.
3. Direct users to the Streams UI for full management and visualization when appropriate.
`;
}

/**
 * Creates the Sig Events skill with the given tool IDs and optional content override.
 * When toolIds is undefined, the skill exposes all allowed tools. When provided, only those IDs
 * are exposed; each must be in SIG_EVENTS_SKILL_REGISTRY_TOOL_IDS.
 * When content is provided, it replaces the default skill content (markdown for the model).
 */
export const createSigEventsSkill = (toolIds?: string[], content?: string) => {
  const ids =
    toolIds === undefined
      ? [...SIG_EVENTS_SKILL_REGISTRY_TOOL_IDS]
      : (() => {
          const invalid = toolIds.filter((id) => !allowedSet.has(id));
          if (invalid.length > 0) {
            throw new Error(
              `Invalid Sig Events skill tool IDs: ${invalid.join(
                ', '
              )}. Allowed: ${SIG_EVENTS_SKILL_REGISTRY_TOOL_IDS.join(', ')}.`
            );
          }
          return toolIds.length > 0 ? [...toolIds] : [];
        })();

  const resolvedContent =
    content ??
    (ids.length < SIG_EVENTS_SKILL_REGISTRY_TOOL_IDS.length
      ? buildSkillContentForToolIds(ids)
      : DEFAULT_SIG_EVENTS_SKILL_CONTENT);

  return defineSkillType({
    id: SIG_EVENTS_SKILL_ID,
    name: 'sig-events',
    basePath: 'skills/observability',
    description:
      'Guides the agent to help users understand and work with Streams and significant events in stream data.',
    content: resolvedContent,
    getRegistryTools: () => [...ids],
  });
};
