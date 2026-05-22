/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import {
  validateHost,
  validateDownloadSourceHeaders,
  useDowloadSourceFlyoutForm,
  type AuthType,
} from './use_download_source_flyout_form';

jest.mock('../../../../../../hooks/use_authz', () => ({
  useAuthz: () => ({
    fleet: {
      allSettings: true,
    },
  }),
}));

describe('useDowloadSourceFlyoutForm SSL certificate path validation', () => {
  it('should block submission when certificate path contains spaces', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    const { result } = testRenderer.renderHook(() =>
      useDowloadSourceFlyoutForm(onSuccess, undefined)
    );

    act(() => {
      result.current.inputs.nameInput.setValue('My Source');
      result.current.inputs.hostInput.setValue('https://artifacts.example.com');
      result.current.inputs.sslCertificateInput.setValue('/path with spaces/cert.pem');
    });

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => {
      expect(result.current.inputs.sslCertificateInput.errors).toBeDefined();
      expect(onSuccess).not.toBeCalled();
      expect(result.current.isDisabled).toBeTruthy();
    });
  });

  it('should block submission when certificate key path contains spaces', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    const { result } = testRenderer.renderHook(() =>
      useDowloadSourceFlyoutForm(onSuccess, undefined)
    );

    act(() => {
      result.current.inputs.nameInput.setValue('My Source');
      result.current.inputs.hostInput.setValue('https://artifacts.example.com');
      result.current.inputs.sslKeyInput.setValue('/path with spaces/key.pem');
    });

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => {
      expect(result.current.inputs.sslKeyInput.errors).toBeDefined();
      expect(onSuccess).not.toBeCalled();
      expect(result.current.isDisabled).toBeTruthy();
    });
  });

  it('should block submission when certificate authorities path contains spaces', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    const { result } = testRenderer.renderHook(() =>
      useDowloadSourceFlyoutForm(onSuccess, undefined)
    );

    act(() => {
      result.current.inputs.nameInput.setValue('My Source');
      result.current.inputs.hostInput.setValue('https://artifacts.example.com');
      result.current.inputs.sslCertificateAuthoritiesInput.props.onChange([
        '/path with spaces/ca.pem',
      ]);
    });

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => {
      expect(result.current.inputs.sslCertificateAuthoritiesInput.props.errors).toBeDefined();
      expect(onSuccess).not.toBeCalled();
      expect(result.current.isDisabled).toBeTruthy();
    });
  });

  it('should allow submission when all SSL paths are valid', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    testRenderer.startServices.http.post.mockResolvedValue({ item: {} });
    const { result } = testRenderer.renderHook(() =>
      useDowloadSourceFlyoutForm(onSuccess, undefined)
    );

    act(() => {
      result.current.inputs.nameInput.setValue('My Source');
      result.current.inputs.hostInput.setValue('https://artifacts.example.com');
      result.current.inputs.sslCertificateInput.setValue('/valid/path/cert.pem');
      result.current.inputs.sslKeyInput.setValue('/valid/path/key.pem');
      result.current.inputs.sslCertificateAuthoritiesInput.props.onChange(['/valid/ca.pem']);
    });

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => expect(onSuccess).toBeCalled());
  });
});

describe('Download source form validation', () => {
  describe('validateHost', () => {
    it('should not work without any urls', () => {
      const res = validateHost('');

      expect(res).toEqual(['Host is required']);
    });

    it('should work with valid url with https protocol', () => {
      const res = validateHost('https://test.co:9200');

      expect(res).toBeUndefined();
    });

    it('should work with valid url with http protocol', () => {
      const res = validateHost('http://test.co');

      expect(res).toBeUndefined();
    });

    it('should work with valid url with path', () => {
      const res = validateHost('http://test.co/download');

      expect(res).toBeUndefined();
    });

    it('should return an error with invalid url', () => {
      const res = validateHost('toto');

      expect(res).toEqual(['Invalid URL']);
    });

    it('should return an error with url with invalid port', () => {
      const res = validateHost('https://test.fr:qwerty9200');

      expect(res).toEqual(['Invalid URL']);
    });
  });

  describe('validateDownloadSourceHeaders', () => {
    it('should return undefined for valid headers', () => {
      const res = validateDownloadSourceHeaders([
        { key: 'X-Custom-Header', value: 'custom-value' },
        { key: 'Authorization', value: 'Bearer token' },
      ]);

      expect(res).toBeUndefined();
    });

    it('should return undefined when Authorization header is present with authType "none"', () => {
      const res = validateDownloadSourceHeaders(
        [{ key: 'Authorization', value: 'Bearer token' }],
        'none'
      );

      expect(res).toBeUndefined();
    });

    it.each<AuthType>(['username_password', 'api_key'])(
      'should return error when Authorization header conflicts with %s authType',
      (authType) => {
        const res = validateDownloadSourceHeaders(
          [
            { key: 'X-Custom-Header', value: 'custom-value' },
            { key: 'Authorization', value: 'Bearer token' },
          ],
          authType
        );

        expect(res).toEqual([
          {
            message:
              'Cannot use "Authorization" header when credentials are configured. The credentials will overwrite this header.',
            index: 1,
            hasKeyError: true,
            hasValueError: false,
          },
        ]);
      }
    );

    it('should return error when Authorization header conflicts with api_key authType', () => {
      const res = validateDownloadSourceHeaders(
        [{ key: 'Authorization', value: 'Bearer token' }],
        'api_key'
      );

      expect(res).toEqual([
        {
          message:
            'Cannot use "Authorization" header when credentials are configured. The credentials will overwrite this header.',
          index: 0,
          hasKeyError: true,
          hasValueError: false,
        },
      ]);
    });

    it('should return error for Authorization header regardless of case when credentials are set', () => {
      const res = validateDownloadSourceHeaders(
        [{ key: 'authorization', value: 'Bearer token' }],
        'api_key'
      );

      expect(res).toHaveLength(1);
      expect(res![0]).toMatchObject({ index: 0, hasKeyError: true });
    });

    it('should return undefined for empty headers (both key and value empty)', () => {
      const res = validateDownloadSourceHeaders([{ key: '', value: '' }]);

      expect(res).toBeUndefined();
    });

    it('should return error when key is provided without value', () => {
      const res = validateDownloadSourceHeaders([{ key: 'X-Custom-Header', value: '' }]);

      expect(res).toEqual([
        {
          message: 'Missing value for key "X-Custom-Header"',
          index: 0,
          hasKeyError: false,
          hasValueError: true,
        },
      ]);
    });

    it('should return error when value is provided without key', () => {
      const res = validateDownloadSourceHeaders([{ key: '', value: 'some-value' }]);

      expect(res).toEqual([
        {
          message: 'Missing key for value "some-value"',
          index: 0,
          hasKeyError: true,
          hasValueError: false,
        },
      ]);
    });

    it('should return error for duplicate keys', () => {
      const res = validateDownloadSourceHeaders([
        { key: 'X-Custom-Header', value: 'value1' },
        { key: 'X-Custom-Header', value: 'value2' },
      ]);

      expect(res).toEqual([
        {
          message: 'Duplicate key "X-Custom-Header"',
          index: 1,
          hasKeyError: true,
          hasValueError: false,
        },
      ]);
    });

    it('should return multiple errors for multiple issues', () => {
      const res = validateDownloadSourceHeaders([
        { key: 'X-Valid', value: 'valid' },
        { key: 'X-Missing-Value', value: '' },
        { key: '', value: 'missing-key' },
        { key: 'X-Valid', value: 'duplicate' },
      ]);

      expect(res).toHaveLength(3);
      expect(res).toContainEqual({
        message: 'Missing value for key "X-Missing-Value"',
        index: 1,
        hasKeyError: false,
        hasValueError: true,
      });
      expect(res).toContainEqual({
        message: 'Missing key for value "missing-key"',
        index: 2,
        hasKeyError: true,
        hasValueError: false,
      });
      expect(res).toContainEqual({
        message: 'Duplicate key "X-Valid"',
        index: 3,
        hasKeyError: true,
        hasValueError: false,
      });
    });
  });
});
