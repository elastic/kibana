/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/onechat-common/attachments';
import {
  AttachmentType,
  type VisualizationRefAttachmentData,
  type VisualizationRefSavedObjectType,
} from '@kbn/onechat-common/attachments';

/**
 * Represents a parsed mention found in the message
 */
export interface ParsedMention {
  /** Type of mention ('viz' or 'map') */
  type: 'viz' | 'map';
  /** Saved object ID */
  id: string;
  /** Full match text (e.g., "@viz:abc123") */
  fullMatch: string;
  /** Start index in original text */
  startIndex: number;
  /** End index in original text */
  endIndex: number;
}

/**
 * Result of parsing mentions from a message
 */
export interface ParseMentionsResult {
  /** Original message with mentions intact */
  originalMessage: string;
  /** Message with mentions replaced by title placeholders (for display) */
  displayMessage: string;
  /** Attachments generated from mentions */
  attachments: Array<AttachmentInput<AttachmentType.visualizationRef, VisualizationRefAttachmentData>>;
  /** List of parsed mentions */
  mentions: ParsedMention[];
}

/**
 * Regex pattern to match @viz:id or @map:id mentions
 * Matches: @viz:abc123, @map:def-456_789
 * ID can contain alphanumeric characters, hyphens, and underscores
 */
const MENTION_PATTERN = /@(viz|map):([a-zA-Z0-9_-]+)/g;

/**
 * Maps the mention type to a default saved object type
 * This is a fallback when no type info is available from the suggestion
 */
function getDefaultSavedObjectType(type: 'viz' | 'map'): VisualizationRefSavedObjectType {
  switch (type) {
    case 'viz':
      // Default to lens as it's most common, but actual type should come from suggestion
      return 'lens';
    case 'map':
      return 'map';
    default:
      return 'lens';
  }
}

/**
 * Info about a selected visualization suggestion
 */
export interface VisualizationSuggestionInfo {
  /** Display title of the visualization */
  title: string;
  /** Actual saved object type (lens, visualization, or map) */
  savedObjectType: VisualizationRefSavedObjectType;
}

/**
 * Parses mentions from a message and extracts visualization reference attachments.
 *
 * Mentions are in the format @type:id where:
 * - type: 'viz' (for lens/visualization) or 'map'
 * - id: saved object ID
 *
 * @param message - The message text to parse
 * @param suggestionInfoMap - Optional map of ID -> suggestion info (title and actual saved object type)
 * @returns ParseMentionsResult with attachments and parsed mentions
 *
 * @example
 * ```ts
 * const { attachments, mentions, displayMessage } = parseMentions(
 *   "Check out @viz:abc123 and @map:xyz789",
 *   {
 *     abc123: { title: "Sales Dashboard", savedObjectType: "lens" },
 *     xyz789: { title: "Store Map", savedObjectType: "map" }
 *   }
 * );
 * // attachments: [visualization_ref attachment, visualization_ref attachment]
 * // mentions: [{ type: 'viz', id: 'abc123', ... }, { type: 'map', id: 'xyz789', ... }]
 * // displayMessage: "Check out Sales Dashboard and Store Map"
 * ```
 */
export function parseMentions(
  message: string,
  suggestionInfoMap?: Record<string, VisualizationSuggestionInfo>
): ParseMentionsResult {
  const mentions: ParsedMention[] = [];
  const attachments: Array<AttachmentInput<AttachmentType.visualizationRef, VisualizationRefAttachmentData>> = [];
  const seenIds = new Set<string>();

  // Reset regex lastIndex (global regex state)
  MENTION_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = MENTION_PATTERN.exec(message)) !== null) {
    const [fullMatch, type, id] = match;
    const mentionType = type as 'viz' | 'map';

    mentions.push({
      type: mentionType,
      id,
      fullMatch,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
    });

    // Only add unique attachments (avoid duplicates for same ID)
    if (!seenIds.has(id)) {
      seenIds.add(id);

      // Get suggestion info if available, otherwise use defaults
      const suggestionInfo = suggestionInfoMap?.[id];
      const savedObjectType = suggestionInfo?.savedObjectType ?? getDefaultSavedObjectType(mentionType);

      const attachment: AttachmentInput<AttachmentType.visualizationRef, VisualizationRefAttachmentData> = {
        type: AttachmentType.visualizationRef,
        data: {
          saved_object_id: id,
          saved_object_type: savedObjectType,
          title: suggestionInfo?.title,
        },
      };

      attachments.push(attachment);
    }
  }

  // Generate display message by replacing mentions with titles
  let displayMessage = message;
  if (suggestionInfoMap) {
    // Replace in reverse order to preserve indices
    const reversedMentions = [...mentions].reverse();
    for (const mention of reversedMentions) {
      const title = suggestionInfoMap[mention.id]?.title || mention.fullMatch;
      displayMessage =
        displayMessage.substring(0, mention.startIndex) +
        title +
        displayMessage.substring(mention.endIndex);
    }
  }

  return {
    originalMessage: message,
    displayMessage,
    attachments,
    mentions,
  };
}

/**
 * Checks if a message contains any @mentions
 */
export function hasMentions(message: string): boolean {
  MENTION_PATTERN.lastIndex = 0;
  return MENTION_PATTERN.test(message);
}

/**
 * Removes all @mentions from a message, leaving just the text
 */
export function stripMentions(message: string): string {
  return message.replace(MENTION_PATTERN, '').replace(/\s+/g, ' ').trim();
}
