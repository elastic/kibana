/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ToastNotificationText } from './toast_notification_text';

describe('ToastNotificationText', () => {
  test('should render the text as plain text', () => {
    const props = {
      text: 'a short text message',
    };
    const { container } = render(<ToastNotificationText {...props} />);
    expect(container.textContent).toBe('a short text message');
  });

  test('should render the text within a modal', () => {
    const props = {
      text:
        'a text message that is longer than 140 characters. a text message that is longer than 140 characters. a text message that is longer than 140 characters. ',
    };
    const { container } = render(<ToastNotificationText {...props} />);
    expect(container.textContent).toBe(
      'a text message that is longer than 140 characters. a text message that is longer than 140 characters. a text message that is longer than 140 ...View details'
    );
  });
});
