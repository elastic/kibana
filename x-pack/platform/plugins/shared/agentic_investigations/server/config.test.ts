/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('agenticInvestigations config', () => {
  it('turns the plugin, escalations and the cases bridge on by default in traditional deployments', () => {
    expect(config.schema.validate({}, { serverless: false })).toEqual({
      enabled: true,
      escalations: { enabled: true },
      cases: { enabled: true },
    });
  });

  it('keeps the plugin off, and escalations and the cases bridge on, by default in serverless', () => {
    expect(config.schema.validate({}, { serverless: true })).toEqual({
      enabled: false,
      escalations: { enabled: true },
      cases: { enabled: true },
    });
  });

  it('turns escalations off with escalations.enabled: false', () => {
    expect(config.schema.validate({ escalations: { enabled: false } }).escalations.enabled).toBe(
      false
    );
  });

  it('exposes the escalations and cases bridge flags to the browser', () => {
    expect(config.exposeToBrowser).toEqual({
      escalations: { enabled: true },
      cases: { enabled: true },
    });
  });
});
