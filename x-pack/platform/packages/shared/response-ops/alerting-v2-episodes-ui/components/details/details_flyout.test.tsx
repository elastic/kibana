/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertEpisodeDetailsFlyout } from './details_flyout';

jest.mock('./details_header_section', () => ({
  AlertEpisodeDetailsHeaderSection: () => <div data-test-subj="headerSectionStub" />,
}));
jest.mock('./overview_section', () => ({
  AlertEpisodeOverviewSection: () => <div data-test-subj="overviewSectionStub" />,
}));
jest.mock('./related_section', () => ({
  AlertEpisodesRelatedSection: () => <div data-test-subj="relatedSectionStub" />,
}));
jest.mock('./metadata_section', () => ({
  AlertEpisodeMetadataSection: () => <div data-test-subj="metadataSectionStub" />,
}));
jest.mock('./runbook_section', () => ({
  AlertEpisodeRunbookSection: () => <div data-test-subj="runbookSectionStub" />,
}));

const baseProps = {
  episodeId: 'ep-1',
  onClose: jest.fn(),
  services: {} as any,
  getEpisodeDetailsHref: (id: string) => `/episodes/${id}`,
  getRuleDetailsHref: (id: string) => `/rules/${id}`,
};

describe('AlertEpisodeDetailsFlyout', () => {
  it('renders header, overview tab body by default, and footer button with the right href', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />);
    expect(screen.getByTestId('headerSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('overviewSectionStub')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeFlyoutViewDetailsButton')).toHaveAttribute(
      'href',
      '/episodes/ep-1'
    );
  });

  it('switches to related tab', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />);
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabRelated'));
    expect(screen.getByTestId('relatedSectionStub')).toBeInTheDocument();
  });

  it('switches to metadata tab', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />);
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabMetadata'));
    expect(screen.getByTestId('metadataSectionStub')).toBeInTheDocument();
  });

  it('switches to runbook tab', () => {
    render(<AlertEpisodeDetailsFlyout {...baseProps} />);
    fireEvent.click(screen.getByTestId('alertingV2EpisodeFlyoutTabRunbook'));
    expect(screen.getByTestId('runbookSectionStub')).toBeInTheDocument();
  });

  it('calls onClose when the flyout fires its close handler', () => {
    const onClose = jest.fn();
    render(<AlertEpisodeDetailsFlyout {...baseProps} onClose={onClose} />);
    // EuiFlyout exposes a close button with aria-label "Close this dialog" by default
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalled();
  });
});
