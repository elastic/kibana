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
  connectorPrompt: <div>{'Connector Prompt'}</div>,
  http: { basePath: { get: jest.fn(() => 'http://localhost:5601') } } as unknown as HttpSetup,
  isAssistantEnabled: false,
  isWelcomeSetup: false,
};

describe('BlockBotCallToAction', () => {
  it('UpgradeButtons is rendered when isAssistantEnabled is false and isWelcomeSetup is false', () => {
    const { getByTestId, queryByTestId } = render(<BlockBotCallToAction {...testProps} />);
    expect(getByTestId('upgrade-buttons')).toBeInTheDocument();
    expect(queryByTestId('connector-prompt')).not.toBeInTheDocument();
  });

  it('connectorPrompt is rendered when isAssistantEnabled is true and isWelcomeSetup is true', () => {
    const props = {
      ...testProps,
      isAssistantEnabled: true,
      isWelcomeSetup: true,
    };
    const { getByTestId, queryByTestId } = render(<BlockBotCallToAction {...props} />);
    expect(getByTestId('connector-prompt')).toBeInTheDocument();
    expect(queryByTestId('upgrade-buttons')).not.toBeInTheDocument();
  });

  it('null is returned when isAssistantEnabled is true and isWelcomeSetup is false', () => {
    const props = {
      ...testProps,
      isAssistantEnabled: true,
      isWelcomeSetup: false,
    };
    const { container, queryByTestId } = render(<BlockBotCallToAction {...props} />);
    expect(container.firstChild).toBeNull();
    expect(queryByTestId('connector-prompt')).not.toBeInTheDocument();
    expect(queryByTestId('upgrade-buttons')).not.toBeInTheDocument();
  });
});
