/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const steps = {
  init: 'init',
  researchAgent: 'researchAgent',
  executeTool: 'executeTool',
  handleToolInterrupt: 'handleToolInterrupt',
  prepareToAnswer: 'prepareToAnswer',
  answerAgent: 'answerAgent',
  finalize: 'finalize',
};

export const tags = {
  agent: 'agent',
  researchAgent: 'research-agent',
  answerAgent: 'answer-agent',
};

export const BROWSER_TOOL_PREFIX = 'browser_';
