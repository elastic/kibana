/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandBadgeData } from './types';
import { getCommandDefinition } from '../command_menu';
import { COMMAND_ID_ATTRIBUTE, COMMAND_METADATA_ATTRIBUTE } from './attributes';
import { getCommandDefinitionByScheme } from '../command_menu/command_definitions';

interface TextSegment {
  type: 'text';
  value: string;
}
interface BadgeSegment {
  type: 'badge';
  data: CommandBadgeData;
}
export type ContentSegment = TextSegment | BadgeSegment;

export class CommandBadgeSerializationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CommandBadgeSerializationError';
  }
}

export const serializeCommandBadge = (element: HTMLElement): string => {
  const commandId = element.getAttribute(COMMAND_ID_ATTRIBUTE) ?? '';
  const commandDefinition = getCommandDefinition(commandId);
  if (!commandDefinition) {
    return '';
  }
  const { scheme } = commandDefinition;
  const displayText = element.textContent ?? '';

  const metadataRaw = element.getAttribute(COMMAND_METADATA_ATTRIBUTE);
  let id = '';
  let queryString = '';

  if (metadataRaw) {
    const metadata: Record<string, string> & { id: string } = { id: '' };
    try {
      const object: unknown = JSON.parse(metadataRaw);
      if (!object || typeof object !== 'object') {
        throw new Error('Could not parse metadata');
      }
      if ('id' in object && typeof object.id === 'string') {
        Object.assign(metadata, object);
      }
    } catch (error) {
      throw new CommandBadgeSerializationError('Could not serialize command badge', {
        cause: error,
      });
    }
    const { id: parsedId, ...rest } = metadata;
    id = parsedId;

    const params = new URLSearchParams(rest);
    const paramString = params.toString();
    if (paramString) {
      queryString = `?${paramString}`;
    }
  }

  return `[${displayText}](${scheme}://${id}${queryString})`;
};

// Matches serialized badge markdown-links: [displayText](scheme://id) or [displayText](scheme://id?key=value)
// Example: [/Summarize](skill://skill-1)
//   Group 1: display text  → "/Summarize"
//   Group 2: scheme        → "skill"
//   Group 3: id (path)     → "skill-1"
//   Group 4: query string  → optional
const BADGE_PATTERN = /\[([^\]]+)\]\((\w+):\/\/([^?)]+)(?:\?([^)]*))?\)/g;

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

    const [_, displayText, scheme, path, queryString] = match;
    const commandDefinition = getCommandDefinitionByScheme(scheme);

    if (commandDefinition) {
      const { id: commandId, sequence } = commandDefinition;
      const label = displayText.startsWith(sequence)
        ? displayText.slice(sequence.length)
        : displayText;

      const metadata: CommandBadgeData['metadata'] = {};
      if (queryString) {
        const params = new URLSearchParams(queryString);
        params.forEach((value, key) => {
          metadata[key] = value;
        });
      }

      segments.push({
        type: 'badge',
        data: {
          commandId,
          label,
          id: path,
          metadata,
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
