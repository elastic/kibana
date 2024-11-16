/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClientChatBedrockConverse } from './chat_bedrock_converse/chat_bedrock_converse';

// the class that was originally here that extended BedrockChat
// from '@langchain/community/chat_models/bedrock/web'
// is deprecated and replaced with ActionsClientChatBedrockConverse
export const ActionsClientBedrockChatModel = ActionsClientChatBedrockConverse;
