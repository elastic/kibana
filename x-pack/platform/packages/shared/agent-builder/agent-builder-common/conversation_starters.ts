/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A conversation starter: a card on the new conversation empty state that sends its label as the
 * message when clicked. It is an object so that more fields can be added later without breaking
 * the API.
 */
export interface ConversationStarter {
  /**
   * Short text shown on the card, and sent as the message when the card is clicked.
   */
  label: string;
}

/** The most conversation starters shown at once. */
export const MAX_CONVERSATION_STARTERS = 3;
