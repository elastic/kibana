/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertEpisodeRunbook } from './runbook';

const RUNBOOK_PREVIEW_MASK = 'linear-gradient(to bottom,#000 55%,transparent 100%)';

describe('AlertEpisodeRunbook', () => {
  it('renders the empty state when no content is provided', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={undefined} />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookEmpty')).toBeInTheDocument();
  });

  it('renders the markdown content when provided', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} />
      </I18nProvider>
    );
    expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookContent')).toBeInTheDocument();
  });

  it('makes links non-interactive in preview mode', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'[Some link](https://elastic.co)'} preview />
      </I18nProvider>
    );

    const preview = screen.getByTestId('alertingV2EpisodeDetailsRunbookPreview');
    expect(preview).not.toHaveAttribute('inert');
    expect(screen.getByRole('link', { name: 'Some link' })).toHaveAttribute('tabindex', '-1');
    expect(preview).toContainElement(screen.getByTestId('alertingV2EpisodeDetailsRunbookContent'));
  });

  it('does not fade preview content that fits within the maximum height', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} preview />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookPreview')).not.toHaveStyleRule(
      'mask-image',
      RUNBOOK_PREVIEW_MASK
    );
  });

  it('fades preview content that exceeds the maximum height', () => {
    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(121);
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(120);

    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} preview />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2EpisodeDetailsRunbookPreview')).toHaveStyleRule(
      'mask-image',
      RUNBOOK_PREVIEW_MASK
    );
  });

  it('does not clamp the content outside preview mode', () => {
    render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} />
      </I18nProvider>
    );

    expect(screen.queryByTestId('alertingV2EpisodeDetailsRunbookPreview')).not.toBeInTheDocument();
  });

  it('scales the markdown down when compressed', () => {
    const { container: normal } = render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} />
      </I18nProvider>
    );
    const normalClass =
      normal.querySelector('[data-test-subj="alertingV2EpisodeDetailsRunbookContent"]')
        ?.className ?? '';

    const { container: compressed } = render(
      <I18nProvider>
        <AlertEpisodeRunbook content={'# Some runbook'} compressed />
      </I18nProvider>
    );
    const compressedClass =
      compressed.querySelector('[data-test-subj="alertingV2EpisodeDetailsRunbookContent"]')
        ?.className ?? '';

    // EuiMarkdownFormat encodes textSize in its class, so the two must differ.
    expect(compressedClass).not.toBe('');
    expect(compressedClass).not.toBe(normalClass);
  });
});
