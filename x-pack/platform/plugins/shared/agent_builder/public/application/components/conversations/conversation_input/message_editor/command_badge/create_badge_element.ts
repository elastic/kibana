/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMAND_BADGE_ATTRIBUTE,
  COMMAND_ID_ATTRIBUTE,
  COMMAND_METADATA_ATTRIBUTE,
} from './attributes';
import { getCommandDefinition } from '../command_menu/command_definitions';
import type { CommandBadgeData } from './types';

/**
 * Creates a non-editable badge span element with embedded metadata.
 */
export const createCommandBadgeElement = (data: CommandBadgeData): HTMLSpanElement => {
  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.setAttribute(COMMAND_BADGE_ATTRIBUTE, 'true');
  span.setAttribute(COMMAND_ID_ATTRIBUTE, data.commandId);
  span.setAttribute(COMMAND_METADATA_ATTRIBUTE, JSON.stringify({ id: data.id, ...data.metadata }));

  const sequence = getCommandDefinition(data.commandId)?.sequence ?? '';
  const displayText = `${sequence}${data.label}`;
  span.textContent = displayText;
  span.classList.add('eui-displayInlineBlock', 'eui-textTruncate');
  span.title = displayText;

  return span;
};

export const isElementCommandBadge = (element: HTMLElement) =>
  element.getAttribute(COMMAND_BADGE_ATTRIBUTE) === 'true';
