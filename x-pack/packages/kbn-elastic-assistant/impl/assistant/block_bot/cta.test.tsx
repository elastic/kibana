/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { BlockBotCallToAction } from './cta';
import { HttpSetup } from '@kbn/core-http-browser';

const testProps = {
  http: { basePath: { get: jest.fn(() => 'http://localhost:5601') } } as unknown as HttpSetup,
  isAssistantEnabled: false,
};

describe('BlockBotCallToAction', () => {
  it('UpgradeButtons is rendered when isAssistantEnabled is false', () => {
    const { getByTestId, queryByTestId } = render(<BlockBotCallToAction {...testProps} />);
    expect(getByTestId('upgrade-buttons')).toBeInTheDocument();
    expect(queryByTestId('connector-prompt')).not.toBeInTheDocument();
  });

  it('null is returned when isAssistantEnabled is true', () => {
    const props = {
      ...testProps,
      isAssistantEnabled: true,
    };
    const { container, queryByTestId } = render(<BlockBotCallToAction {...props} />);
    expect(container.firstChild).toBeNull();
    expect(queryByTestId('upgrade-buttons')).not.toBeInTheDocument();
  });
});
