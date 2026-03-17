/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandBadgeData } from './types';
import type { CommandId } from '../command_menu/types';
import { sortedCommandDefinitions } from '../command_menu/command_definitions';
import { COMMAND_BADGE_ATTRIBUTE, COMMAND_ID_ATTRIBUTE, isDataAttribute } from './attributes';

interface TextSegment {
  type: 'text';
  value: string;
}
interface BadgeSegment {
  type: 'badge';
  data: CommandBadgeData;
}
export type ContentSegment = TextSegment | BadgeSegment;

const COMMAND_ID_TO_SCHEME: Record<string, string> = {};
const SCHEME_TO_COMMAND_ID: Record<string, CommandId> = {};

for (const def of sortedCommandDefinitions) {
  const scheme = def.id;
  COMMAND_ID_TO_SCHEME[def.id] = scheme;
  SCHEME_TO_COMMAND_ID[scheme] = def.id;
}

/**
 * Extracts the first metadata value from a badge's data attributes.
 * Skips `data-command-badge` and `data-command-id` to find the value attribute.
 */
const getMetadataValueFromBadge = (element: HTMLElement): string => {
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (
      isDataAttribute(attr.name) &&
      attr.name !== COMMAND_BADGE_ATTRIBUTE &&
      attr.name !== COMMAND_ID_ATTRIBUTE
    ) {
      return attr.value;
    }
  }
  return '';
};

export const serializeCommandBadge = (element: HTMLElement): string => {
  const commandId = element.getAttribute(COMMAND_ID_ATTRIBUTE) ?? '';
  const scheme = COMMAND_ID_TO_SCHEME[commandId] ?? commandId;
  const label = element.textContent ?? '';
  const metadataValue = getMetadataValueFromBadge(element);
  return `[/${label}](${scheme}://${metadataValue})`;
};

// Matches serialized badge markdown-links: [/label](scheme://metadataValue)
// Example: [/Summarize](skill://skill-1)
//   Group 1: label       → "Summarize"
//   Group 2: scheme      → "skill"
//   Group 3: metadataValue → "skill-1"
const BADGE_PATTERN = /\[\/([^\]]+)\]\((\w+):\/\/([^)]+)\)/g;

/**
 * Parses text containing serialized badge markdown-links into segments.
 * Used to restore badges from serialized content.
 */
export const deserializeCommandBadge = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BADGE_PATTERN.lastIndex = 0;
  match = BADGE_PATTERN.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const [_, label, scheme, metadataValue] = match;
    const commandId = SCHEME_TO_COMMAND_ID[scheme];

    if (commandId) {
      // Find the command definition to determine the metadata key
      const def = sortedCommandDefinitions.find((d) => d.id === commandId);
      const metadataKey = def ? `${def.id}-id` : `${scheme}-id`;

      segments.push({
        type: 'badge',
        data: {
          commandId,
          label,
          metadata: { [metadataKey]: metadataValue },
        },
      });
    } else {
      // Unknown scheme, preserve as text
      segments.push({ type: 'text', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
    match = BADGE_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
};
