/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CollapsedActivityPreview } from './collapsed_activity_preview';

describe('CollapsedActivityPreview', () => {
  it('renders the activity body it is given', () => {
    render(
      <CollapsedActivityPreview data-test-subj="preview" onExpand={jest.fn()}>
        <p>{'A comment body'}</p>
      </CollapsedActivityPreview>
    );

    expect(screen.getByTestId('preview')).toHaveTextContent('A comment body');
  });

  it('keeps the crop out of the accessibility tree and the tab order', () => {
    render(
      <CollapsedActivityPreview data-test-subj="preview" onExpand={jest.fn()}>
        <button type="button">{'Clipped control'}</button>
      </CollapsedActivityPreview>
    );

    // The crop is the inert part; the wrapper stays reachable so the "Show more" control inside it
    // can be clicked and focused.
    const crop = screen.getByTestId('preview-crop');

    expect(crop).toHaveAttribute('aria-hidden', 'true');
    // A control the reader cannot see must not be reachable by keyboard either.
    expect(crop).toHaveAttribute('inert');
  });

  it('offers no "Show more" when nothing is actually clipped', () => {
    render(
      <CollapsedActivityPreview data-test-subj="preview" onExpand={jest.fn()}>
        <p>{'Short enough to fit'}</p>
      </CollapsedActivityPreview>
    );

    // jsdom reports no overflow, which is the "nothing is hidden" case: claiming there is more to
    // read when there is not is the defect this replaced.
    expect(screen.queryByTestId('preview-show-more')).not.toBeInTheDocument();
  });
});
