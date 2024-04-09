/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { InferenceFlyoutProps, InferenceFlyoutWrapper } from './inference_flyout_wrapper';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
export const DEFAULT_VALUES: InferenceFlyoutProps = {
  errorCallout: undefined,
  nlpImportModel: '',
  supportedNlpModels: '',
  elserv2documentationUrl: '',
  e5documentationUrl: '',
  isInferenceFlyoutVisible: false,
  onFlyoutClose: jest.fn(),
  onSaveInferenceEndpoint: jest.fn(),
};
describe('<InferenceFlyoutWrapper />', () => {
  beforeEach(() => {
    render(<InferenceFlyoutWrapper {...DEFAULT_VALUES} />);
  });
  test('inference Flyout page is loaded', async () => {
    expect(screen.getByTestId('addInferenceEndpointTitle')).toBeInTheDocument();
    expect(screen.getAllByTestId('elasticsearch_modelsTab')).toHaveLength(1);
    expect(screen.getAllByTestId('euiFlyoutCloseButton')).toHaveLength(1);
  });
  test('can close Flyout', async () => {
    const closeButton = screen.getByTestId('closeInferenceFlyout');
    fireEvent.click(closeButton);
    expect(DEFAULT_VALUES.onFlyoutClose).toHaveBeenCalled();
  });

  test('can change tab', async () => {
    const connectToApi = screen.getByTestId('connect_to_apiTab');
    fireEvent.click(connectToApi);
    expect(
      screen.getByText('Connect to your preferred model service endpoints.')
    ).toBeInTheDocument();

    const eland = screen.getByTestId('eland_python_clientTab');
    fireEvent.click(eland);
    expect(screen.getByTestId('mlElandPipInstallCodeBlock')).toBeInTheDocument();
  });
  test('Can change super select value in connect to api', async () => {
    const connectToApi = screen.getByTestId('connect_to_apiTab');
    fireEvent.click(connectToApi);
    expect(screen.getAllByTestId('huggingFaceUrl')).toHaveLength(1);
    expect(screen.getAllByTestId('huggingFaceUrlApiKey')).toHaveLength(1);

    const superSelectButton = screen.getByText('HuggingFace');
    fireEvent.click(superSelectButton);

    expect(screen.getAllByTestId('serviceType-cohere')).toHaveLength(1);
    expect(screen.getAllByTestId('serviceType-openai')).toHaveLength(1);

    const superSelectChangeModelType = screen.getByText('Open AI');
    fireEvent.click(superSelectChangeModelType);
    expect(screen.getAllByTestId('openaiApiKey')).toHaveLength(1);
  });
});
export {};
