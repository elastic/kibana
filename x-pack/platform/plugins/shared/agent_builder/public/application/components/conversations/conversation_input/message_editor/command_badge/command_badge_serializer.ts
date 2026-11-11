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
import {
  ATTACHMENT_ID_PARAM,
  isPlaceholderKind,
  type PlaceholderKind,
} from '../attachment_placeholder';

interface TextSegment {
  type: 'text';
  value: string;
}
interface BadgeSegment {
  type: 'badge';
  data: CommandBadgeData;
}
interface AttachmentSegment {
  type: 'attachment';
  kind: PlaceholderKind;
  name: string;
  attachmentId?: string;
}
export type ContentSegment = TextSegment | BadgeSegment | AttachmentSegment;

export class CommandBadgeSerializationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CommandBadgeSerializationError';
  }
}

const encodeId = (id: string): string =>
  encodeURIComponent(id).replace(/[()]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);

const decodeId = (id: string): string => {
  try {
    return decodeURIComponent(id);
  } catch {
    // Malformed percent-encoding, keep the raw id.
    return id;
  }
};

// Unescaped brackets would end the link text early, and the badge would not parse.
export const unescapeLinkText = (text: string): string => text.replace(/\\([\\[\]])/g, '$1');

export const serializeCommandBadge = (element: HTMLElement): string => {
  const commandId = element.getAttribute(COMMAND_ID_ATTRIBUTE) ?? '';
  const commandDefinition = getCommandDefinition(commandId);
  if (!commandDefinition) {
    return '';
  }
  const { scheme } = commandDefinition;
  const displayText = (element.textContent ?? '').replace(/[\\[\]]/g, '\\$&');

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

  // The id is encoded: an unencoded `:` (SML entry ids) or `)` would make the link invalid.
  return `[${displayText}](${scheme}://${encodeId(id)}${queryString})`;
};

// Matches serialized badge markdown-links: [displayText](scheme://id) or [displayText](scheme://id?key=value)
// Example: [/Summarize](skill://skill-1)
//   Group 1: display text  → "/Summarize"
//   Group 2: scheme        → "skill"
//   Group 3: id (path)     → "skill-1"
//   Group 4: query string  → optional
const BADGE_PATTERN = /\[((?:\\.|[^\]\\])+)\]\((\w+):\/\/([^?)]+)(?:\?([^)]*))?\)/g;

/**
 * Parses text containing serialized badge, image, binary and text file markdown-links into segments.
 * Used to restore badges and attachment chips from serialized content.
 */
export const deserializeInputSegments = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BADGE_PATTERN.lastIndex = 0;
  match = BADGE_PATTERN.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const [_, escapedDisplayText, scheme, path, queryString] = match;
    const displayText = unescapeLinkText(escapedDisplayText);

    if (isPlaceholderKind(scheme)) {
      try {
        const name = decodeURIComponent(path);
        const attachmentId = queryString
          ? new URLSearchParams(queryString).get(ATTACHMENT_ID_PARAM) ?? undefined
          : undefined;
        segments.push(
          scheme === 'binary' && attachmentId
            ? { type: 'attachment', kind: scheme, name, attachmentId }
            : { type: 'attachment', kind: scheme, name }
        );
      } catch {
        // Malformed percent-encoding, preserve as text
        segments.push({ type: 'text', value: match[0] });
      }
    } else {
      const commandDefinition = getCommandDefinitionByScheme(scheme);

      if (commandDefinition) {
        const { id: commandId, sequence, legacySequences = [] } = commandDefinition;
        const prefix = [sequence, ...legacySequences].find((candidate) =>
          displayText.startsWith(candidate)
        );
        const label = prefix ? displayText.slice(prefix.length) : displayText;

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
            id: decodeId(path),
            metadata,
          },
        });
      } else {
        // Unknown scheme, preserve as text
        segments.push({ type: 'text', value: match[0] });
      }
    }

    lastIndex = match.index + match[0].length;
    match = BADGE_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
};
