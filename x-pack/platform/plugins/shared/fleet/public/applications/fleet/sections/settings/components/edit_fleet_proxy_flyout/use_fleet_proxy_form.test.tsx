/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFleetProxyForm } from './use_fleet_proxy_form';

jest.mock('../../hooks/use_confirm_modal', () => ({
  ...jest.requireActual('../../hooks/use_confirm_modal'),
  useConfirmModal: () => ({ confirm: () => true }),
}));

jest.mock('../../../../../../hooks/use_authz', () => ({
  useAuthz: () => ({
    fleet: {
      allSettings: true,
    },
  }),
}));

describe('useFleetProxyForm', () => {
  describe('validate url', () => {
    it('should accept http url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('http://test.fr:8080'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeTruthy());
      expect(result.current.inputs.urlInput.errors).toBeUndefined();
    });

    it('should accept https url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('https://test.fr:8080'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeTruthy());
      expect(result.current.inputs.urlInput.errors).toBeUndefined();
    });
    it('should accept socks5 url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('socks5://test.fr:8080'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeTruthy());
      expect(result.current.inputs.urlInput.errors).toBeUndefined();
    });

    it('should not accept invalid url', async () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));
      act(() => result.current.inputs.urlInput.setValue('iamnotavaliderror'));
      act(() => expect(result.current.inputs.urlInput.validate()).toBeFalsy());

      expect(result.current.inputs.urlInput.errors).toEqual(['Invalid URL']);
    });
  });

  describe('SSL certificate path validation', () => {
    it('should block submission when certificate path contains spaces', async () => {
      const testRenderer = createFleetTestRendererMock();
      const onSuccess = jest.fn();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, onSuccess));

      act(() => {
        result.current.inputs.nameInput.setValue('My Proxy');
        result.current.inputs.urlInput.setValue('http://proxy.example.com:3128');
        result.current.inputs.certificateInput.setValue('/path with spaces/cert.pem');
      });

      await act(() => result.current.submit());

      await testRenderer.waitFor(() => {
        expect(result.current.inputs.certificateInput.errors).toBeDefined();
        expect(onSuccess).not.toBeCalled();
        expect(result.current.isDisabled).toBeTruthy();
      });
    });

    it('should block submission when certificate key path contains spaces', async () => {
      const testRenderer = createFleetTestRendererMock();
      const onSuccess = jest.fn();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, onSuccess));

      act(() => {
        result.current.inputs.nameInput.setValue('My Proxy');
        result.current.inputs.urlInput.setValue('http://proxy.example.com:3128');
        result.current.inputs.certificateKeyInput.setValue('/path with spaces/key.pem');
      });

      await act(() => result.current.submit());

      await testRenderer.waitFor(() => {
        expect(result.current.inputs.certificateKeyInput.errors).toBeDefined();
        expect(onSuccess).not.toBeCalled();
        expect(result.current.isDisabled).toBeTruthy();
      });
    });

    it('should allow submission with valid certificate path', () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));

      act(() => result.current.inputs.certificateInput.setValue('/valid/path/cert.pem'));
      act(() => expect(result.current.inputs.certificateInput.validate()).toBeTruthy());
      expect(result.current.inputs.certificateInput.errors).toBeUndefined();
    });

    it('should allow PEM certificate content regardless of spaces', () => {
      const testRenderer = createFleetTestRendererMock();
      const { result } = testRenderer.renderHook(() => useFleetProxyForm(undefined, () => {}));

      act(() =>
        result.current.inputs.certificateInput.setValue(
          '-----BEGIN CERTIFICATE-----\nMIID\n-----END CERTIFICATE-----'
        )
      );
      act(() => expect(result.current.inputs.certificateInput.validate()).toBeTruthy());
      expect(result.current.inputs.certificateInput.errors).toBeUndefined();
    });
  });
});
