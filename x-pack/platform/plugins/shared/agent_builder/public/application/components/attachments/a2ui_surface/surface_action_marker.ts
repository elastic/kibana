/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Invisible prefix prepended to messages sent via onSurfaceAction.
 * round_input uses this to detect surface-action messages and render
 * them as compact pills instead of full chat bubbles.
 */
export const SURFACE_ACTION_MARKER = '\0surface_action\0';

/**
 * Extract a human-readable label from a surface action message.
 * Returns `undefined` when the message is not a surface action.
 */
export const parseSurfaceActionLabel = (message: string): string | undefined => {
  if (!message.startsWith(SURFACE_ACTION_MARKER)) {
    return undefined;
  }

  const body = message.slice(SURFACE_ACTION_MARKER.length);
  const match = body.match(/^\[Surface action: (.+?)\]/);
  return match ? `Submitted: ${match[1]}` : 'Form submitted';
};
