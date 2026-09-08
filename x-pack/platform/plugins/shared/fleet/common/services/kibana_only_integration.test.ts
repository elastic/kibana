/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PackageInfo, RegistryPolicyTemplate, RegistryVarsEntry } from '../types';
import {
  isKibanaOnlyIntegration,
  isConnectorVar,
  getConnectorChecklist,
  isConnectorSetupComplete,
} from './kibana_only_integration';

const template = (name: string, inputs: unknown[]): RegistryPolicyTemplate =>
  ({ name, title: name, description: name, inputs } as unknown as RegistryPolicyTemplate);

const pkg = (templates: RegistryPolicyTemplate[]): Pick<PackageInfo, 'policy_templates'> =>
  ({ policy_templates: templates } as Pick<PackageInfo, 'policy_templates'>);

const varDef = (
  name: string,
  extra: Partial<RegistryVarsEntry> = {}
): RegistryVarsEntry => ({ name, type: 'text', ...extra } as RegistryVarsEntry);

describe('FLEET-013 · Kibana-only integration helpers', () => {
  describe('isKibanaOnlyIntegration', () => {
    it('detects a package whose only policy template has empty inputs', () => {
      expect(isKibanaOnlyIntegration(pkg([template('sdlc_intel', [])]))).toBe(true);
    });

    it('is false when the template declares inputs', () => {
      expect(isKibanaOnlyIntegration(pkg([template('nginx', [{ type: 'logfile' }])]))).toBe(false);
    });

    it('is false when ANY template declares inputs (partial match must not hide the agent step)', () => {
      expect(
        isKibanaOnlyIntegration(
          pkg([template('kibana_only', []), template('agent_based', [{ type: 'logfile' }])])
        )
      ).toBe(false);
    });

    it('is true only when EVERY template has empty inputs', () => {
      expect(isKibanaOnlyIntegration(pkg([template('a', []), template('b', [])]))).toBe(true);
    });

    it('is false when inputs is undefined rather than an empty array', () => {
      expect(
        isKibanaOnlyIntegration(pkg([{ name: 'x', title: 'x' } as RegistryPolicyTemplate]))
      ).toBe(false);
    });

    it('is false for a package with no policy templates', () => {
      expect(isKibanaOnlyIntegration(pkg([]))).toBe(false);
    });

    it('is false for undefined package info', () => {
      expect(isKibanaOnlyIntegration(undefined)).toBe(false);
    });

    it('scopes the check to a named template when given', () => {
      const info = pkg([template('kibana_only', []), template('agent_based', [{ type: 'log' }])]);

      expect(isKibanaOnlyIntegration(info, 'kibana_only')).toBe(true);
      expect(isKibanaOnlyIntegration(info, 'agent_based')).toBe(false);
    });

    it('is false when the named template does not exist', () => {
      expect(isKibanaOnlyIntegration(pkg([template('a', [])]), 'missing')).toBe(false);
    });
  });

  describe('isConnectorVar', () => {
    it.each([['github_connector_id'], ['slack_connector']])('recognises %s', (name) => {
      expect(isConnectorVar(varDef(name))).toBe(true);
    });

    it.each([['analysis_window_days'], ['connector_timeout'], ['id']])(
      'does not recognise %s',
      (name) => {
        expect(isConnectorVar(varDef(name))).toBe(false);
      }
    );
  });

  describe('getConnectorChecklist', () => {
    const packageVars = {
      vars: [
        varDef('github_connector_id', { required: true, description: 'GitHub connector' }),
        varDef('slack_connector', { required: false, title: 'Slack' }),
        varDef('analysis_window_days', { required: true }),
      ],
    } as Pick<PackageInfo, 'vars'>;

    it('lists only connector vars, ignoring unrelated package vars', () => {
      expect(getConnectorChecklist(packageVars).map((i) => i.name)).toEqual([
        'github_connector_id',
        'slack_connector',
      ]);
    });

    it('marks a connector as configured when a value is present', () => {
      const checklist = getConnectorChecklist(packageVars, { github_connector_id: 'abc-123' });

      expect(checklist.find((i) => i.name === 'github_connector_id')?.configured).toBe(true);
      expect(checklist.find((i) => i.name === 'slack_connector')?.configured).toBe(false);
    });

    it('treats an empty or whitespace-only value as not configured', () => {
      const checklist = getConnectorChecklist(packageVars, {
        github_connector_id: '   ',
        slack_connector: '',
      });

      expect(checklist.every((i) => !i.configured)).toBe(true);
    });

    it('carries required and title/description through for rendering', () => {
      const [github, slack] = getConnectorChecklist(packageVars);

      expect(github).toMatchObject({
        name: 'github_connector_id',
        title: 'github_connector_id',
        description: 'GitHub connector',
        required: true,
      });
      expect(slack).toMatchObject({ title: 'Slack', required: false });
    });

    it('returns an empty checklist when the package declares no vars', () => {
      expect(getConnectorChecklist({ vars: [] } as Pick<PackageInfo, 'vars'>)).toEqual([]);
      expect(getConnectorChecklist(undefined)).toEqual([]);
    });
  });

  describe('isConnectorSetupComplete', () => {
    it('is true when every required connector is configured', () => {
      expect(
        isConnectorSetupComplete([
          { name: 'a', title: 'a', required: true, configured: true },
          { name: 'b', title: 'b', required: false, configured: false },
        ])
      ).toBe(true);
    });

    it('is false when a required connector is missing', () => {
      expect(
        isConnectorSetupComplete([{ name: 'a', title: 'a', required: true, configured: false }])
      ).toBe(false);
    });

    it('is true for an empty checklist (nothing to configure)', () => {
      expect(isConnectorSetupComplete([])).toBe(true);
    });

    it('ignores optional connectors when deciding completeness', () => {
      expect(
        isConnectorSetupComplete([{ name: 'b', title: 'b', required: false, configured: false }])
      ).toBe(true);
    });
  });

  describe('sdlc_intel manifest shape (regression guard)', () => {
    it('classifies the shipped sdlc_intel manifest as Kibana-only with a GitHub connector', () => {
      const sdlcIntel = {
        policy_templates: [template('sdlc_intel', [])],
        vars: [
          varDef('github_connector_id', { required: true }),
          varDef('analysis_window_days'),
        ],
      } as Pick<PackageInfo, 'policy_templates' | 'vars'>;

      expect(isKibanaOnlyIntegration(sdlcIntel)).toBe(true);

      const checklist = getConnectorChecklist(sdlcIntel);
      expect(checklist).toHaveLength(1);
      expect(checklist[0]).toMatchObject({ name: 'github_connector_id', required: true });
      expect(isConnectorSetupComplete(checklist)).toBe(false);

      const configured = getConnectorChecklist(sdlcIntel, { github_connector_id: 'gh-1' });
      expect(isConnectorSetupComplete(configured)).toBe(true);
    });
  });
});
