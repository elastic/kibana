/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';

/**
 * Derives a per-session deterministic salt from a session identifier and the server-side
 * encryption secret.
 *
 * The same (sessionId, serverSecret) pair always produces the same salt, so tokens
 * generated across multiple turns of the same conversation are stable and can be
 * correlated for deanonymization. Different sessions with the same PII value produce
 * different tokens, preventing cross-session correlation.
 *
 * @param sessionId - Identifier for the conversation/session (e.g. conversationId, replacementsId).
 * @param serverSecret - Server-side secret material (e.g. encryptedSavedObjects.encryptionKey).
 * @returns A hex string to use as the HMAC secret for token generation.
 */
export const deriveSalt = (sessionId: string, serverSecret: string): string => {
  return createHmac('sha256', serverSecret).update(sessionId).digest('hex');
};
