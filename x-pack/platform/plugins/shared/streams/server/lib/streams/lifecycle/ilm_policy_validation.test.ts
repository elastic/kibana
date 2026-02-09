/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from '../errors/status_error';
import {
  assertPolicyNameIsValid,
  assertValidPolicyPhases,
  type ExistingIlmPolicy,
} from './ilm_policy_validation';

describe('ilm policy validation', () => {
  const warmPhase = { warm: { min_age: '30d', actions: {} } };
  const hotPhase = { hot: { min_age: '0ms', actions: {} } };
  const policyWithHot: ExistingIlmPolicy = {
    policy: {
      phases: {
        ...hotPhase,
        ...warmPhase,
      },
    },
  };

  const policyWithoutHot: ExistingIlmPolicy = {
    policy: {
      phases: {
        ...warmPhase,
      },
    },
  };
  describe('assertValidPolicyPhases', () => {
    describe('at least one phase required', () => {
      it('throws when incomingPhases is undefined', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: undefined,
            incomingPhases: undefined,
            allowMissingHot: true,
          })
        ).toThrow(
          expect.objectContaining({
            message: 'Policy must have at least one phase',
            statusCode: 400,
          })
        );
      });

      it('throws when incomingPhases is an empty object', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: undefined,
            incomingPhases: {},
            allowMissingHot: true,
          })
        ).toThrow(
          expect.objectContaining({
            message: 'Policy must have at least one phase',
            statusCode: 400,
          })
        );
      });

      it('does not throw when at least one phase is present', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: undefined,
            incomingPhases: hotPhase,
            allowMissingHot: true,
          })
        ).not.toThrow();
      });
    });

    describe('when incoming phases include hot', () => {
      it('does not throw for a new policy', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: undefined,
            incomingPhases: hotPhase,
            allowMissingHot: false,
          })
        ).not.toThrow();
      });

      it('does not throw when updating a policy with hot', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: policyWithHot,
            incomingPhases: hotPhase,
            allowMissingHot: false,
          })
        ).not.toThrow();
      });

      it('does not throw when updating a policy without hot', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: policyWithoutHot,
            incomingPhases: hotPhase,
            allowMissingHot: false,
          })
        ).not.toThrow();
      });
    });

    describe('new policy missing hot', () => {
      it('throws when allowMissingHot is false', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: undefined,
            incomingPhases: warmPhase,
            allowMissingHot: false,
          })
        ).toThrow(
          expect.objectContaining({
            message: 'Policy is missing a required hot phase',
            statusCode: 400,
          })
        );
      });

      it('does not throw when allowMissingHot is true', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: undefined,
            incomingPhases: warmPhase,
            allowMissingHot: true,
          })
        ).not.toThrow();
      });
    });

    describe('updating a policy missing hot', () => {
      it('throws when existing policy has hot and incoming drops it', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: policyWithHot,
            incomingPhases: warmPhase,
            allowMissingHot: false,
          })
        ).toThrow(
          expect.objectContaining({
            message: 'Policy is missing a required hot phase',
            statusCode: 400,
          })
        );
      });

      it('throws when existing policy has hot even if allowMissingHot is true', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: policyWithHot,
            incomingPhases: warmPhase,
            allowMissingHot: true,
          })
        ).toThrow(StatusError);
      });

      it('does not throw when existing policy already is missing hot', () => {
        expect(() =>
          assertValidPolicyPhases({
            existingPolicy: policyWithoutHot,
            incomingPhases: warmPhase,
            allowMissingHot: false,
          })
        ).not.toThrow();
      });
    });
  });

  describe('assertPolicyNameIsValid', () => {
    it('throws when policy already exists and allowOverwrite is false', () => {
      expect(() => assertPolicyNameIsValid(policyWithHot, false)).toThrow(StatusError);
    });

    it('does not throw when policy already exists and allowOverwrite is true', () => {
      expect(() => assertPolicyNameIsValid(policyWithHot, true)).not.toThrow();
    });

    it('does not throw when policy does not exist', () => {
      expect(() => assertPolicyNameIsValid(undefined, false)).not.toThrow();
    });
  });
});
