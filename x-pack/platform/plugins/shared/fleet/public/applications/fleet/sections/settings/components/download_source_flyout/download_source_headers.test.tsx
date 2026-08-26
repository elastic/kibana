/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import type { DownloadSourceFormInputsType } from './use_download_source_flyout_form';
import { DownloadSourceHeaders } from './download_source_headers';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useGeneratedHtmlId: () => 'mocked-id',
}));

const createMockInputs = (
  overrides: {
    disabled?: boolean;
    keyValuePairs?: Array<{ key: string; value: string }>;
    errors?: any[];
  } = {}
): DownloadSourceFormInputsType => {
  const { disabled = false, keyValuePairs = [{ key: '', value: '' }], errors = [] } = overrides;
  const headersInput = {
    props: { onChange: jest.fn(), disabled },
    value: keyValuePairs,
    formRowProps: { error: errors },
  };
  const stubInput = { props: {}, value: '', formRowProps: {} };
  return {
    nameInput: stubInput,
    defaultDownloadSourceInput: stubInput,
    hostInput: stubInput,
    proxyIdInput: stubInput,
    sslCertificateInput: stubInput,
    sslKeyInput: stubInput,
    sslKeySecretInput: stubInput,
    sslCertificateAuthoritiesInput: stubInput,
    authTypeInput: stubInput,
    usernameInput: stubInput,
    passwordInput: stubInput,
    passwordSecretInput: stubInput,
    apiKeyInput: stubInput,
    apiKeySecretInput: stubInput,
    headersInput,
  } as unknown as DownloadSourceFormInputsType;
};

describe('DownloadSourceHeaders', () => {
  it('renders key/value fields and buttons', () => {
    const inputs = createMockInputs({
      keyValuePairs: [{ key: 'X-Custom', value: 'val' }],
    });
    const renderer = createFleetTestRendererMock();
    const result = renderer.render(<DownloadSourceHeaders inputs={inputs} />);

    expect(result.getByTestId('downloadSourceHeadersKeyInput0')).not.toBeDisabled();
    expect(result.getByTestId('downloadSourceHeadersValueInput0')).not.toBeDisabled();
    expect(result.getByTestId('downloadSourceHeadersDeleteButton0')).not.toBeDisabled();
    expect(result.getByTestId('downloadSourceHeaders.addRowButton')).not.toBeDisabled();
  });

  it('disables all inputs when disabled is true', () => {
    const inputs = createMockInputs({
      disabled: true,
      keyValuePairs: [{ key: 'X-Custom', value: 'val' }],
    });
    const renderer = createFleetTestRendererMock();
    const result = renderer.render(<DownloadSourceHeaders inputs={inputs} />);

    expect(result.getByTestId('downloadSourceHeadersKeyInput0')).toBeDisabled();
    expect(result.getByTestId('downloadSourceHeadersValueInput0')).toBeDisabled();
    expect(result.getByTestId('downloadSourceHeadersDeleteButton0')).toBeDisabled();
    expect(result.getByTestId('downloadSourceHeaders.addRowButton')).toBeDisabled();
  });

  it('disables add button when there is an empty row', () => {
    const inputs = createMockInputs({
      keyValuePairs: [{ key: '', value: '' }],
    });
    const renderer = createFleetTestRendererMock();
    const result = renderer.render(<DownloadSourceHeaders inputs={inputs} />);

    expect(result.getByTestId('downloadSourceHeaders.addRowButton')).toBeDisabled();
  });

  it('enables add button when no empty row and not disabled', () => {
    const inputs = createMockInputs({
      keyValuePairs: [{ key: 'X-Custom', value: 'val' }],
    });
    const renderer = createFleetTestRendererMock();
    const result = renderer.render(<DownloadSourceHeaders inputs={inputs} />);

    expect(result.getByTestId('downloadSourceHeaders.addRowButton')).not.toBeDisabled();
  });
});
