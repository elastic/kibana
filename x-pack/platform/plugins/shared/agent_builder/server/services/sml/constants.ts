/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatSystemIndex } from '@kbn/agent-builder-server';

export const smlIndexAlias = chatSystemIndex('sml-attachments');
export const smlWriteAlias = chatSystemIndex('sml-attachments-write');
export const smlIndexPrefix = chatSystemIndex('sml-attachments-');
export const smlCrawlerStateIndex = chatSystemIndex('sml-crawler-state');

export const smlDefaultFetchInterval = '10m';
export const smlSearchDefaultSize = 25;
export const smlCrawlerTaskType = 'agent_builder:sml_crawler';
export const smlTaskScope = ['agent_builder'];
