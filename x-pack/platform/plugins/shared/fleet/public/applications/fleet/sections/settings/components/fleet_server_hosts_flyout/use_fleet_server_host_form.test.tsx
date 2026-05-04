/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFleetServerHostsForm } from './use_fleet_server_host_form';

jest.mock('../../hooks/use_confirm_modal', () => ({
  ...jest.requireActual('../../hooks/use_confirm_modal'),
  useConfirmModal: () => ({ confirm: () => true }),
}));

describe('useFleetServerHostsForm', () => {
  it('should not allow to submit an invalid form', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    const { result } = testRenderer.renderHook(() => useFleetServerHostsForm(undefined, onSuccess));

    act(() =>
      result.current.inputs.hostUrlsInput.props.onChange(['https://test.fr', 'https://test.fr'])
    );

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => {
      expect(result.current.inputs.hostUrlsInput.props.errors).toMatchInlineSnapshot(`
        Array [
          Object {
            "index": 0,
            "message": "Duplicate URL",
          },
          Object {
            "index": 1,
            "message": "Duplicate URL",
          },
        ]
      `);
      expect(onSuccess).not.toBeCalled();
      expect(result.current.isDisabled).toBeTruthy();
    });
  });

  it('should submit a valid form', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    testRenderer.startServices.http.post.mockResolvedValue({});
    const { result } = testRenderer.renderHook(() =>
      useFleetServerHostsForm(
        {
          id: 'id1',
          name: 'fleet server 1',
          host_urls: [],
          is_default: false,
          is_preconfigured: false,
        },
        onSuccess
      )
    );

    act(() => result.current.inputs.hostUrlsInput.props.onChange(['https://test.fr']));

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => expect(onSuccess).toBeCalled());
  });

  it('should submit a valid form with SSL options', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    testRenderer.startServices.http.put.mockResolvedValue({});
    const { result } = testRenderer.renderHook(() =>
      useFleetServerHostsForm(
        {
          id: 'id1',
          name: 'fleet server 1',
          host_urls: [],
          is_default: false,
          is_preconfigured: false,
          ssl: {
            certificate_authorities: ['/etc/certs/ca.pem'],
            es_certificate_authorities: ['/etc/certs/es-ca.pem'],
            certificate: '/etc/certs/cert.pem',
            es_certificate: '/etc/certs/es-cert.pem',
            agent_certificate_authorities: ['/etc/certs/agent-ca.pem'],
            agent_certificate: '/etc/certs/agent-cert.pem',
            agent_key: '/etc/certs/agent-key.pem',
          },
        },
        onSuccess
      )
    );

    act(() => result.current.inputs.hostUrlsInput.props.onChange(['https://test.fr']));

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => expect(onSuccess).toBeCalled());
  });

  describe('SSL certificate path validation', () => {
    it('should block submission when a certificate path contains spaces', async () => {
      const testRenderer = createFleetTestRendererMock();
      const onSuccess = jest.fn();
      const { result } = testRenderer.renderHook(() =>
        useFleetServerHostsForm(
          {
            id: 'id1',
            name: 'fleet server 1',
            host_urls: ['https://test.fr'],
            is_default: false,
            is_preconfigured: false,
          },
          onSuccess
        )
      );

      act(() => result.current.inputs.sslCertificateInput.setValue('/path with spaces/cert.pem'));

      await act(() => result.current.submit());

      await testRenderer.waitFor(() => {
        expect(result.current.inputs.sslCertificateInput.errors).toBeDefined();
        expect(onSuccess).not.toBeCalled();
        expect(result.current.isDisabled).toBeTruthy();
      });
    });

    it('should block submission when an ES certificate authorities path contains spaces', async () => {
      const testRenderer = createFleetTestRendererMock();
      const onSuccess = jest.fn();
      const { result } = testRenderer.renderHook(() =>
        useFleetServerHostsForm(
          {
            id: 'id1',
            name: 'fleet server 1',
            host_urls: ['https://test.fr'],
            is_default: false,
            is_preconfigured: false,
          },
          onSuccess
        )
      );

      act(() =>
        result.current.inputs.sslEsCertificateAuthoritiesInput.props.onChange([
          '/path with spaces/ca.pem',
        ])
      );

      await act(() => result.current.submit());

      await testRenderer.waitFor(() => {
        expect(result.current.inputs.sslEsCertificateAuthoritiesInput.props.errors).toBeDefined();
        expect(onSuccess).not.toBeCalled();
        expect(result.current.isDisabled).toBeTruthy();
      });
    });

    it('should allow submission when all SSL paths are valid', async () => {
      const testRenderer = createFleetTestRendererMock();
      const onSuccess = jest.fn();
      testRenderer.startServices.http.put.mockResolvedValue({});
      const { result } = testRenderer.renderHook(() =>
        useFleetServerHostsForm(
          {
            id: 'id1',
            name: 'fleet server 1',
            host_urls: ['https://test.fr'],
            is_default: false,
            is_preconfigured: false,
          },
          onSuccess
        )
      );

      act(() => {
        result.current.inputs.sslCertificateInput.setValue('/valid/path/cert.pem');
        result.current.inputs.sslKeyInput.setValue('/valid/path/key.pem');
        result.current.inputs.sslCertificateAuthoritiesInput.props.onChange(['/valid/ca.pem']);
      });

      await act(() => result.current.submit());

      await testRenderer.waitFor(() => expect(onSuccess).toBeCalled());
    });
  });

  it('should allow the user to correct and submit an invalid form', async () => {
    const testRenderer = createFleetTestRendererMock();
    const onSuccess = jest.fn();
    testRenderer.startServices.http.post.mockResolvedValue({});
    const { result } = testRenderer.renderHook(() =>
      useFleetServerHostsForm(
        {
          id: 'id1',
          name: 'fleet server 1',
          host_urls: [],
          is_default: false,
          is_preconfigured: false,
        },
        onSuccess
      )
    );

    act(() =>
      result.current.inputs.hostUrlsInput.props.onChange(['https://test.fr', 'https://test.fr'])
    );

    await act(() => result.current.submit());

    await testRenderer.waitFor(() => {
      expect(onSuccess).not.toBeCalled();
      expect(result.current.isDisabled).toBeTruthy();
    });

    act(() => result.current.inputs.hostUrlsInput.props.onChange(['https://test.fr']));
    expect(result.current.isDisabled).toBeFalsy();

    await act(() => result.current.submit());
    await testRenderer.waitFor(() => expect(onSuccess).toBeCalled());
  });
});
