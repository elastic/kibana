/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderConnectorFiles } from './connector_env';
import type { SeedConnector } from './connector_env';

const makeConnector = (overrides: Partial<SeedConnector> = {}): SeedConnector => ({
  id: 'connector-abc123',
  name: 'My Connector',
  actionTypeId: '.github',
  config: {},
  secrets: {},
  ...overrides,
});

describe('renderConnectorFiles', () => {
  it('returns empty env and minimal markdown for an empty list', () => {
    const { env, markdown } = renderConnectorFiles([]);
    expect(env).toBe('');
    expect(markdown).toContain('# Available Connectors');
  });

  describe('env-var naming', () => {
    it('sanitizes spaces to underscores and uppercases the name', () => {
      const { env } = renderConnectorFiles([makeConnector({ name: 'GitHub Enterprise' })]);
      expect(env).toContain('CONNECTOR_GITHUB_ENTERPRISE_ID=');
    });

    it('sanitizes hyphens in field names', () => {
      const { env } = renderConnectorFiles([
        makeConnector({ name: 'My Connector', config: { 'base-url': 'https://example.com' } }),
      ]);
      expect(env).toContain('CONNECTOR_MY_CONNECTOR_BASE_URL=');
    });

    it('strips leading and trailing underscores from sanitized names', () => {
      const { env } = renderConnectorFiles([makeConnector({ name: '!!webhook!!' })]);
      expect(env).toContain('CONNECTOR_WEBHOOK_ID=');
    });
  });

  describe('collision handling', () => {
    it('appends the first 6 chars of the id (uppercased) when two connectors share a sanitized name', () => {
      const connectors: SeedConnector[] = [
        makeConnector({ id: 'abc123def', name: 'GitHub Enterprise', actionTypeId: '.github' }),
        makeConnector({ id: 'xyz456ghi', name: 'GitHub Enterprise', actionTypeId: '.github' }),
      ];
      const { env } = renderConnectorFiles(connectors);
      expect(env).toContain('CONNECTOR_GITHUB_ENTERPRISE_ABC123_ID=');
      expect(env).toContain('CONNECTOR_GITHUB_ENTERPRISE_XYZ456_ID=');
    });

    it('does not add a suffix when only one connector has a given name', () => {
      const { env } = renderConnectorFiles([makeConnector({ name: 'Unique Name' })]);
      expect(env).not.toMatch(/CONNECTOR_UNIQUE_NAME_[A-Z0-9]{6}_ID=/);
      expect(env).toContain('CONNECTOR_UNIQUE_NAME_ID=');
    });
  });

  describe('shell quoting', () => {
    it('wraps values in single quotes', () => {
      const { env } = renderConnectorFiles([makeConnector({ secrets: { token: 'plain-value' } })]);
      expect(env).toMatch(/CONNECTOR_MY_CONNECTOR_TOKEN='plain-value'/);
    });

    it("escapes single quotes inside values via the '\\'' pattern", () => {
      const { env } = renderConnectorFiles([
        makeConnector({ secrets: { token: "it's a secret" } }),
      ]);
      // Expected: 'it'\''s a secret'
      expect(env).toContain(`CONNECTOR_MY_CONNECTOR_TOKEN='it'\\''s a secret'`);
    });
  });

  describe('stringify', () => {
    it('JSON-serializes object config values', () => {
      const { env } = renderConnectorFiles([makeConnector({ config: { opts: { a: 1 } } })]);
      expect(env).toContain(`CONNECTOR_MY_CONNECTOR_OPTS='{"a":1}'`);
    });

    it('JSON-serializes array config values', () => {
      const { env } = renderConnectorFiles([makeConnector({ config: { tags: ['a', 'b'] } })]);
      expect(env).toContain(`CONNECTOR_MY_CONNECTOR_TAGS='["a","b"]'`);
    });

    it('converts null to an empty string', () => {
      const { env } = renderConnectorFiles([makeConnector({ config: { optional: null } })]);
      expect(env).toMatch(/CONNECTOR_MY_CONNECTOR_OPTIONAL=''/);
    });

    it('converts undefined to an empty string', () => {
      const { env } = renderConnectorFiles([makeConnector({ config: { optional: undefined } })]);
      expect(env).toMatch(/CONNECTOR_MY_CONNECTOR_OPTIONAL=''/);
    });
  });

  describe('connectors.md', () => {
    it('lists variable names but does NOT include secret values', () => {
      const secretValue = 'super-secret-api-key-do-not-leak';
      const { markdown } = renderConnectorFiles([
        makeConnector({ secrets: { apiKey: secretValue } }),
      ]);
      expect(markdown).toContain('CONNECTOR_MY_CONNECTOR_APIKEY');
      expect(markdown).not.toContain(secretValue);
    });

    it('lists variable names but does NOT include config values', () => {
      const configValue = 'https://internal.example.com';
      const { markdown } = renderConnectorFiles([makeConnector({ config: { url: configValue } })]);
      expect(markdown).toContain('CONNECTOR_MY_CONNECTOR_URL');
      expect(markdown).not.toContain(configValue);
    });

    it('includes the connector type', () => {
      const { markdown } = renderConnectorFiles([makeConnector({ actionTypeId: '.pagerduty' })]);
      expect(markdown).toContain('`.pagerduty`');
    });
  });

  describe('comment header in .env', () => {
    it('includes the connector id and name (not name twice)', () => {
      const { env } = renderConnectorFiles([
        makeConnector({ id: 'abc-123', name: 'My Connector', actionTypeId: '.github' }),
      ]);
      expect(env).toContain('# abc-123: My Connector (.github)');
    });
  });

  it('exports both ID and TYPE vars for each connector', () => {
    const { env } = renderConnectorFiles([makeConnector()]);
    expect(env).toContain('CONNECTOR_MY_CONNECTOR_ID=');
    expect(env).toContain('CONNECTOR_MY_CONNECTOR_TYPE=');
  });

  it('produces valid shell syntax for a connector with empty config and secrets', () => {
    const { env } = renderConnectorFiles([makeConnector({ config: {}, secrets: {} })]);
    // Should not have any lines beyond the comment + ID + TYPE + blank line
    const lines = env.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3); // comment, ID, TYPE
  });
});
