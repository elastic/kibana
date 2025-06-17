/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageAttachmentChildren } from './attachment_children';
import type { PageAttachmentPersistedState } from './types';

describe('PageAttachmentChildren', () => {
  const mockPersistableState: PageAttachmentPersistedState = {
    type: 'mockType',
    url: {
      actionLabel: 'View in Dashboards',
      pathAndQuery: '/test/path?query=1',
      label: 'Sample Dashboard',
      iconType: 'link',
    },
    screenContext: 'This is a sample screen context for testing purposes.',
  };

  it('renders the link with correct label and href', () => {
    render(<PageAttachmentChildren persistableStateAttachmentState={mockPersistableState} />);

    const link = screen.getByRole('link', { name: 'Test Page' });
    expect(link).toHaveAttribute('href', '/test/path');
  });
});
