/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { CommandBadgeData } from './types';
export type { ContentSegment } from './command_badge_serializer';
export { COMMAND_BADGE_ATTRIBUTE } from './attributes';
export { createCommandBadgeElement, isElementCommandBadge } from './create_badge_element';
export {
  deserializeCommandBadge,
  serializeCommandBadge,
  CommandBadgeSerializationError,
} from './command_badge_serializer';
export { charOffsetToDomPosition } from './char_offset_to_dom_position';
