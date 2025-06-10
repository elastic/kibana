/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export enum ModelPlatform {
  OpenAI = 'OpenAI',
  AzureOpenAI = 'AzureOpenAI',
  AmazonBedrock = 'AmazonBedrock',
  GoogleVertex = 'GoogleVertex',
  Elastic = 'Elastic',
  Other = 'other',
}

export enum ModelProvider {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  Google = 'Google',
  Other = 'Other',
  Elastic = 'Elastic',
}

export enum ModelFamily {
  GPT = 'GPT',
  Claude = 'Claude',
  Gemini = 'Gemini',
}

export interface Model {
  provider: ModelProvider;
  family: ModelFamily;
  id?: string;
}
