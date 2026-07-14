/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Realistic region availability matrix shared across all EIS mock endpoints.
 * Covers all four geo zones (apac, eu, us, other) with representative CSP
 * regions so the Manage Region Preferences modal renders a fully populated
 * Geo tab and Regions tab during demo / Scout tests.
 */
const MOCK_EIS_REGIONS = [
  // Asia Pacific
  { csp: 'aws', region: 'ap-southeast-1', geo: 'apac' },
  { csp: 'aws', region: 'ap-northeast-1', geo: 'apac' },
  { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
  { csp: 'azure', region: 'southeastasia', geo: 'apac' },
  // Europe
  { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
  { csp: 'aws', region: 'eu-central-1', geo: 'eu' },
  { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
  { csp: 'azure', region: 'westeurope', geo: 'eu' },
  // North America
  { csp: 'aws', region: 'us-east-1', geo: 'us' },
  { csp: 'aws', region: 'us-west-2', geo: 'us' },
  { csp: 'gcp', region: 'us-central1', geo: 'us' },
  { csp: 'azure', region: 'eastus', geo: 'us' },
  // Other
  { csp: 'aws', region: 'me-south-1', geo: 'other' },
  { csp: 'aws', region: 'sa-east-1', geo: 'other' },
];

export const eisEndpointsMockData = [
  {
    inference_id: '.mock-anthropic-claude-3.7-sonnet-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'anthropic-claude-3.7-sonnet' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Anthropic Claude Sonnet 3.7', model_creator: 'Anthropic' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-anthropic-claude-3.7-sonnet-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'anthropic-claude-3.7-sonnet' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Anthropic Claude Sonnet 3.7', model_creator: 'Anthropic' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-openai-gpt-4.1-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-gpt-4.1' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'OpenAI GPT-4.1', model_creator: 'OpenAI' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-openai-gpt-4.1-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-gpt-4.1' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'OpenAI GPT-4.1', model_creator: 'OpenAI' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    // Non-EIS custom endpoint — no regions (not managed by EIS region policy)
    inference_id: 'my-custom-openai-gpt-4.1-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-gpt-4.1' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'OpenAI GPT-4.1', model_creator: 'OpenAI' },
    },
  },
  {
    inference_id: '.mock-google-gemini-2.5-pro-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'google-gemini-2.5-pro' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Google Gemini 2.5 Pro', model_creator: 'Google' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-google-gemini-2.5-pro-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'google-gemini-2.5-pro' },
    metadata: {
      heuristics: { properties: ['multilingual', 'multimodal'], status: 'ga' },
      display: { name: 'Google Gemini 2.5 Pro', model_creator: 'Google' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-elastic-elser-text_embedding',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: { model_id: 'elastic-elser-v2' },
    metadata: {
      heuristics: { properties: ['multilingual'], status: 'ga' },
      display: { name: 'Elastic ELSER v2', model_creator: 'Elastic' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-openai-gpt-3.5-chat_completion',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-gpt-3.5' },
    metadata: {
      heuristics: {
        properties: ['multilingual'],
        status: 'deprecated',
        end_of_life_date: '2099-01-01',
      },
      display: { name: 'OpenAI GPT-3.5', model_creator: 'OpenAI' },
      regions: MOCK_EIS_REGIONS,
    },
  },
  {
    inference_id: '.mock-openai-davinci-completion',
    task_type: 'completion',
    service: 'elastic',
    service_settings: { model_id: 'openai-davinci' },
    metadata: {
      heuristics: {
        properties: ['multilingual'],
        status: 'deprecated',
        end_of_life_date: '2020-01-01',
      },
      display: { name: 'OpenAI Davinci', model_creator: 'OpenAI' },
      regions: MOCK_EIS_REGIONS,
    },
  },
];
