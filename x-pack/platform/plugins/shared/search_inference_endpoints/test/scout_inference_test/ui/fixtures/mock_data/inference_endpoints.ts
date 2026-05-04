/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockInferenceEndpoints = [
  {
    inference_id: '.mock-anthropic-claude-3.7-sonnet-chat_completion-a3f1',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'anthropic-claude-3.7-sonnet' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Anthropic Claude Sonnet 3.7', model_creator: 'Anthropic' },
    },
  },
  {
    inference_id: '.mock-anthropic-claude-3.7-sonnet-completion-b7d2',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'anthropic-claude-3.7-sonnet' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Anthropic Claude Sonnet 3.7', model_creator: 'Anthropic' },
    },
  },
  {
    inference_id: '.mock-openai-gpt-4.1-chat_completion-c9e4',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-gpt-4.1' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'OpenAI GPT-4.1', model_creator: 'OpenAI' },
    },
  },
  {
    inference_id: '.mock-openai-gpt-4.1-completion-d5f6',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-gpt-4.1' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'OpenAI GPT-4.1', model_creator: 'OpenAI' },
    },
  },
  {
    inference_id: '.mock-google-gemini-2.5-pro-chat_completion-e2a8',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'google-gemini-2.5-pro' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Google Gemini 2.5 Pro', model_creator: 'Google' },
    },
  },
  {
    inference_id: '.mock-google-gemini-2.5-pro-completion-f1b3',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'google-gemini-2.5-pro' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Google Gemini 2.5 Pro', model_creator: 'Google' },
    },
  },
];
