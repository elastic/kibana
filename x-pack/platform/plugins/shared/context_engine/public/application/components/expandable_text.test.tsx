/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExpandableText, TEXT_PREVIEW_LENGTH } from './expandable_text';

const renderText = (text: string, maxLength?: number) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <p data-test-subj="host">
          <ExpandableText text={text} maxLength={maxLength} />
        </p>
      </EuiProvider>
    </I18nProvider>
  );

const host = () => screen.getByTestId('host');

describe('ExpandableText', () => {
  it('shows short text as-is, with nothing to expand', () => {
    renderText('Three retrievals for "refund" returned nothing.');

    expect(host()).toHaveTextContent('Three retrievals for "refund" returned nothing.');
    expect(screen.queryByTestId('contextExpandableTextToggle')).not.toBeInTheDocument();
  });

  it('collapses long text to the preview length and expands it in place', () => {
    const text = `${'a'.repeat(TEXT_PREVIEW_LENGTH)}THE-TAIL`;
    renderText(text);

    expect(host()).not.toHaveTextContent('THE-TAIL');
    expect(host().textContent).toContain(`${'a'.repeat(TEXT_PREVIEW_LENGTH)}...`);

    fireEvent.click(screen.getByTestId('contextExpandableTextToggle'));

    expect(host()).toHaveTextContent('THE-TAIL');
  });

  it('collapses again on a second toggle', () => {
    const text = `${'a'.repeat(TEXT_PREVIEW_LENGTH)}THE-TAIL`;
    renderText(text);

    fireEvent.click(screen.getByText('Show more'));
    fireEvent.click(screen.getByText('Show less'));

    expect(host()).not.toHaveTextContent('THE-TAIL');
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('leaves text exactly at the limit alone', () => {
    renderText('a'.repeat(TEXT_PREVIEW_LENGTH));

    expect(screen.queryByTestId('contextExpandableTextToggle')).not.toBeInTheDocument();
  });

  it('honours a caller-supplied limit', () => {
    renderText('abcdefghij', 4);

    expect(host().textContent).toContain('abcd...');
    expect(screen.getByTestId('contextExpandableTextToggle')).toBeInTheDocument();
  });
});
