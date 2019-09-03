/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AgentConfigurationIntake {
  settings: {
    transaction_sample_rate: number;
  };
  service: {
    name: string;
    environment?: string;
  };
}

export interface AgentConfiguration extends AgentConfigurationIntake {
  '@timestamp': number;
}
