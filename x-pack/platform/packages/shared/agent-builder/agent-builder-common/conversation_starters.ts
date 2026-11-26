/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A conversation starter: a card on the new conversation empty state that sends its prompt, or its
 * label when it has none, as the message when clicked. It is an object so that more fields can be
 * added later without breaking the API.
 */
export interface ConversationStarter {
  /**
   * Short text shown on the card. It is also sent as the message when the starter has no prompt.
   */
  label: string;
  /**
   * Optional longer text sent as the message instead of the label when the card is clicked. It is
   * not shown, so it should say what the label says.
   */
  prompt?: string;
}

/** The most conversation starters shown at once. */
export const MAX_CONVERSATION_STARTERS = 3;

/** The most characters a label of a conversation starter should have. */
export const CONVERSATION_STARTER_LABEL_MAX_LENGTH = 30;
