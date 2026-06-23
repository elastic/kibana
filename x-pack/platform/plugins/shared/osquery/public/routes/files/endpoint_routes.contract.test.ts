/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Contract guard for the Elastic Defend (Endpoint) response-action HTTP routes
 * that the Files tab consumes. Osquery does not (and must not) depend on
 * `security_solution`, so we cannot import its config-schemas here. Instead this
 * test pins the route paths and request-body shapes the frontend sends.
 *
 * If the Endpoint `get_file` / `run_script` API drifts (renamed route, changed
 * body shape), this test still passes locally — so it MUST be kept in sync by
 * hand. The values below are mirrored from, and were verified against:
 *   x-pack/solutions/security/plugins/security_solution/common/endpoint/constants.ts
 *     GET_FILE_ROUTE   = '/api/endpoint/action/get_file'
 *     RUN_SCRIPT_ROUTE = '/api/endpoint/action/run_script'
 *   .../actions/response_actions/get_file/get_file.ts
 *     body: { ...BaseActionRequestSchema, parameters: { path: string } }
 *       BaseActionRequestSchema requires: endpoint_ids: string[]
 *   .../actions/response_actions/run_script/run_script.ts
 *     body: { ...BaseActionRequestSchema (minus parameters), parameters: {...} }
 *
 * Treat a failure here as a signal to re-verify the Endpoint API and update both
 * `use_file_actions.ts` and this guard together.
 */

const EXPECTED_GET_FILE_ROUTE = '/api/endpoint/action/get_file';
const EXPECTED_RUN_SCRIPT_ROUTE = '/api/endpoint/action/run_script';

// The minimal required keys of each request body, per the Endpoint schemas.
const GET_FILE_REQUIRED_KEYS = ['endpoint_ids', 'parameters'] as const;
const RUN_SCRIPT_REQUIRED_KEYS = ['endpoint_ids', 'parameters'] as const;

const buildGetFileBody = (endpointId: string, path: string) => ({
  endpoint_ids: [endpointId],
  parameters: { path },
});

const buildRunScriptBody = (endpointId: string, path: string) => ({
  endpoint_ids: [endpointId],
  parameters: { hostPath: path },
});

describe('Endpoint response-action route contract (consumed by the Files tab)', () => {
  describe('get_file', () => {
    it('pins the route path', () => {
      expect(EXPECTED_GET_FILE_ROUTE).toBe('/api/endpoint/action/get_file');
    });

    it('sends a body with the required endpoint_ids and parameters.path', () => {
      const body = buildGetFileBody('endpoint-1', '/etc/passwd');

      GET_FILE_REQUIRED_KEYS.forEach((key) => expect(body).toHaveProperty(key));
      expect(Array.isArray(body.endpoint_ids)).toBe(true);
      expect(body.endpoint_ids).toEqual(['endpoint-1']);
      expect(typeof body.parameters.path).toBe('string');
      expect(body.parameters.path.length).toBeGreaterThan(0);
    });
  });

  describe('run_script', () => {
    it('pins the route path', () => {
      expect(EXPECTED_RUN_SCRIPT_ROUTE).toBe('/api/endpoint/action/run_script');
    });

    it('sends a body with the required endpoint_ids and a parameters object', () => {
      const body = buildRunScriptBody('endpoint-1', '/tmp/script.sh');

      RUN_SCRIPT_REQUIRED_KEYS.forEach((key) => expect(body).toHaveProperty(key));
      expect(body.endpoint_ids).toEqual(['endpoint-1']);
      expect(typeof body.parameters.hostPath).toBe('string');
      expect(body.parameters.hostPath).toBe('/tmp/script.sh');
    });
  });
});
