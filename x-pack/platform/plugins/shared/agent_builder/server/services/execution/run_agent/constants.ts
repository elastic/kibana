/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// check for background executions and other background work every X agent cycles.
export const BACKGROUND_CHECK_CYCLE_INTERVAL = 3;

export const steps = {
  init: 'init',
  checkBackgroundWork: 'checkBackgroundWork',
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
