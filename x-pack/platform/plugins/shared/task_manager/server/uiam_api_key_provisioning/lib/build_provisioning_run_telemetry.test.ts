/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSuccessProvisioningRunTelemetry,
  failedProvisioningRunTelemetry,
} from './build_provisioning_run_telemetry';

describe('build_provisioning_run_telemetry', () => {
  describe('failedProvisioningRunTelemetry', () => {
    it('returns error-shaped telemetry', () => {
      expect(failedProvisioningRunTelemetry()).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        has_more_to_provision: false,
        has_error: true,
        run_number: 0,
      });
    });
  });

  describe('buildSuccessProvisioningRunTelemetry', () => {
    it('aggregates counts and flags', () => {
      expect(
        buildSuccessProvisioningRunTelemetry({
          completed: 7,
          failed: 2,
          skipped: 3,
          hasMoreToProvision: true,
          nextRunNumber: 5,
        })
      ).toEqual({
        total: 12,
        completed: 7,
        failed: 2,
        skipped: 3,
        has_more_to_provision: true,
        has_error: false,
        run_number: 5,
      });
    });
  });
});
