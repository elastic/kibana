/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiModal, EuiOverlayMask } from '@elastic/eui';
import React, { useState } from 'react';

import { ApolloConsumer } from 'react-apollo';
import * as i18n from '../translations';
import { StatefulOpenTimeline } from '..';

export interface OpenTimelineModalButtonProps {
  /**
   * An optional callback that if specified, will perform arbitrary IO before
   * this component updates its internal toggle state.
   */
  onToggle?: () => void;
}

const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;
const OPEN_TIMELINE_MODAL_WIDTH = 1000; // px

/**
 * Renders a button that when clicked, displays the `Open Timelines` modal
 */
export const OpenTimelineModalButton = React.memo<OpenTimelineModalButtonProps>(({ onToggle }) => {
  const [showModal, setShowModal] = useState(false);

  /** shows or hides the `Open Timeline` modal */
  function toggleShowModal() {
    if (onToggle != null) {
      onToggle();
    }
    setShowModal(!showModal);
  }

  function closeModalTimeline() {
    toggleShowModal();
  }
  return (
    <ApolloConsumer>
      {client => (
        <>
          <EuiButtonEmpty
            color="text"
            data-test-subj="open-timeline-button"
            iconSide="left"
            iconType="folderOpen"
            onClick={toggleShowModal}
          >
            {i18n.OPEN_TIMELINE}
          </EuiButtonEmpty>

          {showModal && (
            <EuiOverlayMask>
              <EuiModal
                data-test-subj="open-timeline-modal"
                maxWidth={OPEN_TIMELINE_MODAL_WIDTH}
                onClose={toggleShowModal}
              >
                <StatefulOpenTimeline
                  apolloClient={client}
                  closeModalTimeline={closeModalTimeline}
                  isModal={true}
                  defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                  title={i18n.OPEN_TIMELINE_TITLE}
                />
              </EuiModal>
            </EuiOverlayMask>
          )}
        </>
      )}
    </ApolloConsumer>
  );
});

OpenTimelineModalButton.displayName = 'OpenTimelineModalButton';
