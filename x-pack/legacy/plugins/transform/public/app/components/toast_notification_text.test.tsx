/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { KibanaContext } from '../lib/kibana';
import { createPublicShim } from '../../shim';
import { getAppProviders } from '../app_dependencies';

import { ToastNotificationText } from './toast_notification_text';

jest.mock('../../shared_imports');

describe('ToastNotificationText', () => {
  test('should render the text as plain text', () => {
    const Providers = getAppProviders(createPublicShim());
    const props = {
      text: 'a short text message',
    };
    const { container } = render(
      <Providers>
        <KibanaContext.Provider value={{ initialized: false }}>
          <ToastNotificationText {...props} />
        </KibanaContext.Provider>
      </Providers>
    );
    expect(container.textContent).toBe('a short text message');
  });

  test('should render the text within a modal', () => {
    const Providers = getAppProviders(createPublicShim());
    const props = {
      text:
        'a text message that is longer than 140 characters. a text message that is longer than 140 characters. a text message that is longer than 140 characters. ',
    };
    const { container } = render(
      <Providers>
        <KibanaContext.Provider value={{ initialized: false }}>
          <ToastNotificationText {...props} />
        </KibanaContext.Provider>
      </Providers>
    );
    expect(container.textContent).toBe(
      'a text message that is longer than 140 characters. a text message that is longer than 140 characters. a text message that is longer than 140 ...View details'
    );
  });
});
