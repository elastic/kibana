/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class NightshiftModelBlockedError extends Error {
  constructor(modelId: string, defaultConnectorId?: string) {
    super(
      defaultConnectorId
        ? `Nightshift can't use model "${modelId}": the GenAI setting "Default connector only" (genAiSettings:defaultAIConnectorOnly) only allows "${defaultConnectorId}". Turn that setting off, or run with "${defaultConnectorId}" as the model.`
        : `Nightshift can't use model "${modelId}": the GenAI setting "Default connector only" (genAiSettings:defaultAIConnectorOnly) is on but no default AI connector is set, so every model is blocked. Set a default AI connector or turn the setting off.`
    );
    this.name = 'NightshiftModelBlockedError';
  }
}
