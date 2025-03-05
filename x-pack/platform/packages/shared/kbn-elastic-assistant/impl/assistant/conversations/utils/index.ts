/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { Conversation } from '../../../..';

export const conversationContainsContentReferences = (conversation?: Conversation): boolean => {
  return (
    conversation?.messages.some((message) => !isEmpty(message.metadata?.contentReferences)) ?? false
  );
};

/** Checks if the conversations has replacements, not if the replacements are actually used */
export const conversationContainsAnonymizedValues = (conversation?: Conversation): boolean => {
  return !isEmpty(conversation?.replacements);
};
