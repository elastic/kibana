/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for features available to the elastic assistant
 */
export type AssistantFeatures = { [K in keyof typeof defaultAssistantFeatures]: boolean };

/**
 * Type for keys of the assistant features
 */
export type AssistantFeatureKey = keyof AssistantFeatures;

/**
 * Default features available to the elastic assistant
 */
export const defaultAssistantFeatures = Object.freeze({
  assistantModelEvaluation: false,
  defendInsights: true,
  attackDiscoveryAlertFiltering: false,
  contentReferencesEnabled: false,
});
