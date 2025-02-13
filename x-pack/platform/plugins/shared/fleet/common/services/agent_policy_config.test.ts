/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { pick } from 'lodash';

import { createAgentPolicyMock } from '../mocks';

import {
  isAgentPolicyValidForLicense,
  unsetAgentPolicyAccordingToLicenseLevel,
} from './agent_policy_config';

describe('agent policy config and licenses', () => {
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  describe('isAgentPolicyValidForLicense', () => {
    it('does not allow agent tampering protection to be turned on for gold and below licenses', () => {
      const partialPolicy = { is_protected: true };
      expect(isAgentPolicyValidForLicense(partialPolicy, Gold)).toBeFalsy();
    });
    it('allows agent tampering protection to be turned on for platinum licenses', () => {
      const partialPolicy = { is_protected: true };
      expect(isAgentPolicyValidForLicense(partialPolicy, Platinum)).toBeTruthy();
    });
    it('allows agent tampering protection to be turned off for platinum licenses', () => {
      const partialPolicy = { is_protected: false };
      expect(isAgentPolicyValidForLicense(partialPolicy, Platinum)).toBeTruthy();
    });
  });
  describe('unsetAgentPolicyAccordingToLicenseLevel', () => {
    it('resets all paid features to default if license is gold', () => {
      const defaults = pick(createAgentPolicyMock(), 'is_protected');
      const partialPolicy = { is_protected: true };
      const retPolicy = unsetAgentPolicyAccordingToLicenseLevel(partialPolicy, Gold);
      expect(retPolicy).toEqual(defaults);
    });
    it('does not change paid features if license is platinum', () => {
      const expected = pick(createAgentPolicyMock(), 'is_protected');
      const partialPolicy = { is_protected: false };
      const expected2 = { is_protected: true };
      const partialPolicy2 = { is_protected: true };
      const retPolicy = unsetAgentPolicyAccordingToLicenseLevel(partialPolicy, Platinum);
      expect(retPolicy).toEqual(expected);
      const retPolicy2 = unsetAgentPolicyAccordingToLicenseLevel(partialPolicy2, Platinum);
      expect(retPolicy2).toEqual(expected2);
    });
  });
});
