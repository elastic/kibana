/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '../../../assistant_context/types';

export type ConversationTableItem = Conversation & {
  connectorTypeTitle?: string | null;
  systemPromptTitle?: string | null;
};

export type HandlePageChecked = (params: {
  conversationOptions: ConversationTableItem[];
  totalItemCount: number;
}) => void;

export type HandlePageUnchecked = (params: {
  conversationOptionsIds: string[];
  totalItemCount: number;
}) => void;

export type HandleRowChecked = (params: {
  selectedItem: ConversationTableItem;
  totalItemCount: number;
}) => void;

export type HandleRowUnChecked = (params: {
  selectedItem: ConversationTableItem;
  totalItemCount: number;
}) => void;
