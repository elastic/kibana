/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AttachmentActions } from './attachment_actions';

describe('AttachmentActions', () => {
  it('renders the expand action with the EUI full screen icon', () => {
    render(
      <AttachmentActions
        buttons={[
          {
            label: 'Expand',
            icon: 'expand',
            type: ActionButtonType.SECONDARY,
            handler: jest.fn(),
          },
        ]}
      />
    );

    const button = screen.getByRole('button', { name: 'Expand' });

    expect(button.querySelector('[data-euiicon-type="fullScreen"]')).not.toBeNull();
    expect(button.querySelector('img[src="expand"]')).toBeNull();
  });
});
