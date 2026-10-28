/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deserializeInputSegments } from '../message_editor/command_badge';
import { CommandId } from '../message_editor/command_menu/types';
import type { MentionKind } from '../message_editor/command_menu/menus/mentions/types';
import { stripZeroWidthSpaces } from '../message_editor/utils';

export interface LeadingMention {
  readonly id: string;
  readonly kind: MentionKind;
}

const isMentionKind = (kind: string | undefined): kind is MentionKind =>
  kind === 'user' || kind === 'agent';

/**
 * Returns the mention a serialized message starts with, if any. Spaces and empty lines before it
 * don't matter. Typed `@name` text is not a mention, only a picked one (a chip) is.
 */
export const getLeadingMention = (content: string): LeadingMention | undefined => {
  const firstSegment = deserializeInputSegments(content).find(
    (segment) => segment.type !== 'text' || stripZeroWidthSpaces(segment.value).trim() !== ''
  );

  if (firstSegment?.type !== 'badge' || firstSegment.data.commandId !== CommandId.Mention) {
    return undefined;
  }

  const { kind } = firstSegment.data.metadata;
  return isMentionKind(kind) ? { id: firstSegment.data.id, kind } : undefined;
};
