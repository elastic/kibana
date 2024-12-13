/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { UpgradeLicenseCallToAction } from '.';
import { HttpSetup } from '@kbn/core-http-browser';

const testProps = {
  connectorPrompt: <div>{'Connector Prompt'}</div>,
  http: { basePath: { get: jest.fn(() => 'http://localhost:5601') } } as unknown as HttpSetup,
  isAssistantEnabled: false,
  isWelcomeSetup: false,
};

describe('UpgradeLicenseCallToAction', () => {
  it('UpgradeButtons is rendered ', () => {
    const { getByTestId, queryByTestId } = render(<UpgradeLicenseCallToAction {...testProps} />);
    expect(getByTestId('upgrade-buttons')).toBeInTheDocument();
    expect(queryByTestId('connector-prompt')).not.toBeInTheDocument();
  });
});
