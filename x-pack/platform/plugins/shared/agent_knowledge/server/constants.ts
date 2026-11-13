/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';
import { AGENT_KNOWLEDGE_FEATURE_ID } from '@kbn/agent-knowledge-common';

export const AGENT_KNOWLEDGE_API_PRIVILEGE_READ = ApiPrivileges.read('agentKnowledge');
export const AGENT_KNOWLEDGE_API_PRIVILEGE_MANAGE = ApiPrivileges.manage('agentKnowledge');

export { AGENT_KNOWLEDGE_FEATURE_ID };
