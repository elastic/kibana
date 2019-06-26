/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CentralConfigurationIntake {
  settings: {
    sample_rate: string;
  };
  service: {
    name: string;
    environment?: string;
  };
}

export interface CentralConfiguration extends CentralConfigurationIntake {
  '@timestamp': number;
}
