/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useEpisodeDetailsHeaderData } from '@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions/types';
import { EpisodeDocViewerFooter } from './episode_doc_viewer_footer';

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_episode_details_header_data');

const mockUseEpisodeDetailsHeaderData = jest.mocked(useEpisodeDetailsHeaderData);
const mockExecute = jest.fn();
const mockAckAction = {
  id: 'ALERTING_V2_ACK_EPISODE',
  order: 10,
  displayName: 'Acknowledge',
  iconType: 'check',
  isCompatible: () => true,
  execute: mockExecute,
} as unknown as EpisodeAction;

const renderFooter = (props: Partial<React.ComponentProps<typeof EpisodeDocViewerFooter>> = {}) =>
  render(
    <I18nProvider>
      <EpisodeDocViewerFooter
        episodeId="ep-1"
        groupHash="hash-1"
        services={{} as never}
        actions={[mockAckAction]}
        viewDetailsHref="/app/alerts/ep-1"
        onActionSuccess={jest.fn()}
        {...props}
      />
    </I18nProvider>
  );

describe('EpisodeDocViewerFooter', () => {
  beforeEach(() => {
    mockUseEpisodeDetailsHeaderData.mockReturnValue({
      episode: { 'episode.id': 'ep-1' },
      isActionStateLoaded: true,
    } as unknown as ReturnType<typeof useEpisodeDetailsHeaderData>);
  });

  it('closes the flyout from the Close button', () => {
    const mockOnClose = jest.fn();
    renderFooter({ onClose: mockOnClose });

    fireEvent.click(screen.getByTestId('alertingV2EpisodeDocViewerCloseButton'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('hides the Close button when the host cannot close the flyout', () => {
    renderFooter();

    expect(screen.queryByTestId('alertingV2EpisodeDocViewerCloseButton')).not.toBeInTheDocument();
  });

  it('lists the episode actions and the details link in the Take action menu', async () => {
    renderFooter();

    fireEvent.click(screen.getByTestId('alertingV2EpisodeDocViewerTakeActionButton'));

    expect(
      await screen.findByTestId('alertingV2EpisodeTakeAction-ALERTING_V2_ACK_EPISODE')
    ).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeTakeAction-viewDetails')).toHaveAttribute(
      'href',
      '/app/alerts/ep-1'
    );
  });
});
