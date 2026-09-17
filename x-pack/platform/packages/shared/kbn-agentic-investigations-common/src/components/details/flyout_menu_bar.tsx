/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ConversationDetailsFlyoutMenuBarProps {
  onClose: () => void;
}

/**
 * Share and close controls along the top of the flyout.
 *
 * Only the page-hosted flyout needs this. Agent Builder renders its own menu bar for the flyout
 * it owns, so the registered header slot deliberately has no chrome of its own.
 */
export const ConversationDetailsFlyoutMenuBar = ({
  onClose,
}: ConversationDetailsFlyoutMenuBarProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      justifyContent="flexEnd"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiCopy
          textToCopy={window.location.href}
          beforeMessage={DETAILS_FLYOUT_LABELS.flyoutMenu.share}
          afterMessage={DETAILS_FLYOUT_LABELS.flyoutMenu.shareCopied}
        >
          {(copy) => (
            <EuiButtonIcon
              aria-label={DETAILS_FLYOUT_LABELS.flyoutMenu.share}
              iconType="share"
              color="text"
              onClick={copy}
              data-test-subj="investigationDetailsFlyoutShare"
            />
          )}
        </EuiCopy>
      </EuiFlexItem>

      <span
        aria-hidden="true"
        css={{
          width: '1px',
          height: euiTheme.size.base,
          background: euiTheme.colors.lightShade,
        }}
      />

      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={DETAILS_FLYOUT_LABELS.flyoutMenu.close}
          disableScreenReaderOutput
          display="inlineBlock"
        >
          <EuiButtonIcon
            aria-label={DETAILS_FLYOUT_LABELS.flyoutMenu.close}
            iconType="cross"
            color="text"
            onClick={onClose}
            data-test-subj="investigationDetailsFlyoutClose"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
