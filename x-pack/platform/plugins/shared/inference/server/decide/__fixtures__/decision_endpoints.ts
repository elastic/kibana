/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const decisionEndpoints = {
  endpoints: [
    {
      inference_id: '.jev-1.13-decision',
      task_type: 'decision',
      service: 'elastic',
      service_settings: { model_id: 'jev-1.13' },
    },
    {
      inference_id: '.other-decision',
      task_type: 'decision',
      service: 'elastic',
      service_settings: { model_id: 'other' },
    },
  ],
};
