/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiContextMenu, EuiSplitButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface AlertTimelineViewAllButtonProps {
  viewAllHref: string;
  discoverHref?: string;
}

export const AlertTimelineViewAllButton: React.FC<AlertTimelineViewAllButtonProps> = ({
  viewAllHref,
  discoverHref,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!discoverHref) {
    return (
      <EuiButton
        size="s"
        color="text"
        href={viewAllHref}
        data-test-subj="alertTimelineViewAllEpisodes"
      >
        {i18n.translate('xpack.alertingV2.alertTimeline.viewAllEpisodes', {
          defaultMessage: 'View all episodes',
        })}
      </EuiButton>
    );
  }

  return (
    <EuiSplitButton
      color="text"
      fill={false}
      size="s"
      data-test-subj="alertTimelineViewAllSplitButton"
    >
      <EuiSplitButton.ActionPrimary
        href={viewAllHref}
        data-test-subj="alertTimelineViewAllEpisodes"
      >
        {i18n.translate('xpack.alertingV2.alertTimeline.viewAllEpisodes', {
          defaultMessage: 'View all episodes',
        })}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label={i18n.translate('xpack.alertingV2.alertTimeline.viewAllMoreOptions', {
          defaultMessage: 'More view options',
        })}
        onClick={() => setIsMenuOpen((o) => !o)}
        data-test-subj="alertTimelineViewAllMenuButton"
        popoverProps={{
          isOpen: isMenuOpen,
          closePopover: () => setIsMenuOpen(false),
          anchorPosition: 'downRight',
          panelPaddingSize: 'none',
          children: (
            <EuiContextMenu
              initialPanelId={0}
              panels={[
                {
                  id: 0,
                  items: [
                    {
                      name: i18n.translate('xpack.alertingV2.alertTimeline.viewInDiscover', {
                        defaultMessage: 'View in Discover',
                      }),
                      icon: 'discoverApp',
                      href: discoverHref,
                      'data-test-subj': 'alertTimelineViewInDiscover',
                    },
                  ],
                },
              ]}
            />
          ),
        }}
      />
    </EuiSplitButton>
  );
};
