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
});
