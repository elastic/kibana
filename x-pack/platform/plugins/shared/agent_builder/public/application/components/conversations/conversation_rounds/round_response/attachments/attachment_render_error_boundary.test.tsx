/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AttachmentRenderErrorBoundary } from './attachment_render_error_boundary';

const ThrowingContent = () => {
  throw new Error('boom');
};

describe('AttachmentRenderErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <AttachmentRenderErrorBoundary>
        {() => <div>Attachment content</div>}
      </AttachmentRenderErrorBoundary>
    );

    expect(screen.getByText('Attachment content')).toBeInTheDocument();
  });

  it('renders a fallback callout instead of crashing when a child throws', () => {
    render(
      <AttachmentRenderErrorBoundary>{() => <ThrowingContent />}</AttachmentRenderErrorBoundary>
    );

    expect(screen.getByText("Couldn't render this attachment")).toBeInTheDocument();
  });
});
