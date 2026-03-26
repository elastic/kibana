/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '../../actions_config.mock';
import { assertURL, urlAllowListValidator } from './validators';

describe('Validators', () => {
  describe('urlAllowListValidator', () => {
    it('returns a validator function', () => {
      const validator = urlAllowListValidator('url');
      expect(typeof validator).toBe('function');
    });

    it('does not throw when URL is in allowlist', () => {
      const configUtils = actionsConfigMock.create();
      configUtils.ensureUriAllowed.mockReturnValue(undefined);

      const validator = urlAllowListValidator('url');
      expect(() =>
        validator({ url: 'https://example.com' }, { configurationUtilities: configUtils })
      ).not.toThrow();
      expect(configUtils.ensureUriAllowed).toHaveBeenCalledWith('https://example.com');
    });

    it('throws when URL is not in allowlist', () => {
      const configUtils = actionsConfigMock.create();
      configUtils.ensureUriAllowed.mockImplementation(() => {
        throw new Error('target url is not present in allowedHosts');
      });

      const validator = urlAllowListValidator('url');
      expect(() =>
        validator({ url: 'https://disallowed.com' }, { configurationUtilities: configUtils })
      ).toThrow(/error validating url.*allowedHosts/);
    });

    it('reads URL from nested path', () => {
      const configUtils = actionsConfigMock.create();
      configUtils.ensureUriAllowed.mockReturnValue(undefined);

      const validator = urlAllowListValidator('config.apiUrl');
      expect(() =>
        validator(
          { config: { apiUrl: 'https://nested.example.com' } },
          { configurationUtilities: configUtils }
        )
      ).not.toThrow();
      expect(configUtils.ensureUriAllowed).toHaveBeenCalledWith('https://nested.example.com');
    });

    it('passes empty string when URL key is missing', () => {
      const configUtils = actionsConfigMock.create();
      configUtils.ensureUriAllowed.mockReturnValue(undefined);

      const validator = urlAllowListValidator('missingKey');
      expect(() =>
        validator({ other: 'value' }, { configurationUtilities: configUtils })
      ).not.toThrow();
      expect(configUtils.ensureUriAllowed).toHaveBeenCalledWith('');
    });

    it('error message includes the allowlist error message', () => {
      const configUtils = actionsConfigMock.create();
      const customError = 'Custom validation failed';
      configUtils.ensureUriAllowed.mockImplementation(() => {
        throw new Error(customError);
      });

      const validator = urlAllowListValidator('url');
      expect(() =>
        validator({ url: 'https://test.com' }, { configurationUtilities: configUtils })
      ).toThrow(new RegExp(`error validating url.*${customError}`));
    });
  });

  describe('assertURL function', () => {
    it('valid URL with a valid protocol and hostname does not throw an error', () => {
      expect(() => assertURL('https://www.example.com')).not.toThrow();
    });

    it('invalid URL throws an error with a relevant message', () => {
      expect(() => assertURL('invalidurl')).toThrowError('Invalid URL');
    });

    it('URL with an invalid protocol throws an error with a relevant message', () => {
      expect(() => assertURL('ftp://www.example.com')).toThrowError('Invalid protocol');
    });

    it('function handles case sensitivity of protocols correctly', () => {
      expect(() => assertURL('hTtPs://www.example.com')).not.toThrow();
    });

    it('function handles URLs with query parameters and fragment identifiers correctly', () => {
      expect(() => assertURL('https://www.example.com/path?query=value#fragment')).not.toThrow();
    });
  });
});
