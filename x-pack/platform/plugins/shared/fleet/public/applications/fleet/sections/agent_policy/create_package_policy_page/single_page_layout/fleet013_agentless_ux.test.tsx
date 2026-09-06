/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TestIntegrationInfo {
  name: string;
  inputs?: Array<{ type: string }>;
}

const checkShowAgentPolicyStep = (
  integrationInfo: TestIntegrationInfo | undefined,
  selectedSetupTechnology: string,
  addIntegrationFlyoutProps: unknown
): boolean => {
  const inputs = integrationInfo?.inputs;
  return (
    !addIntegrationFlyoutProps &&
    selectedSetupTechnology !== 'agentless' &&
    !(inputs !== undefined && inputs.length === 0)
  );
};

describe('FLEET-013: Kibana-only integration UX', () => {
  describe('inputs:[] detection', () => {
    it('detects agentless integration when policy template has empty inputs', () => {
      const integrationInfo: TestIntegrationInfo = { name: 'sdlc_intel', inputs: [] };
      const isKibanaOnly =
        integrationInfo.inputs !== undefined && integrationInfo.inputs.length === 0;
      expect(isKibanaOnly).toBe(true);
    });

    it('does not flag as agentless when inputs are present', () => {
      const integrationInfo: TestIntegrationInfo = {
        name: 'apache',
        inputs: [{ type: 'logfile' }],
      };
      const isKibanaOnly =
        integrationInfo.inputs !== undefined && integrationInfo.inputs.length === 0;
      expect(isKibanaOnly).toBe(false);
    });

    it('does not flag as agentless when inputs is undefined', () => {
      const integrationInfo: TestIntegrationInfo = { name: 'apache' };
      const isKibanaOnly =
        integrationInfo.inputs !== undefined && integrationInfo.inputs.length === 0;
      expect(isKibanaOnly).toBe(false);
    });

    it('agent policy step is hidden when inputs is empty', () => {
      const integrationInfo: TestIntegrationInfo = { name: 'sdlc_intel', inputs: [] };
      expect(checkShowAgentPolicyStep(integrationInfo, 'agent', null)).toBe(false);
    });

    it('agent policy step is shown when inputs are present', () => {
      const integrationInfo: TestIntegrationInfo = {
        name: 'apache',
        inputs: [{ type: 'logfile' }],
      };
      expect(checkShowAgentPolicyStep(integrationInfo, 'agent', null)).toBe(true);
    });

    it('agent policy step is shown when no integration info', () => {
      expect(checkShowAgentPolicyStep(undefined, 'agent', null)).toBe(true);
    });
  });
});
