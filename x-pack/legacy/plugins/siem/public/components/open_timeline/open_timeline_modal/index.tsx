/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiModal, EuiOverlayMask } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';
import { StatefulOpenTimeline } from '..';

export interface OpenTimelineModalProps {
  onClose: () => void;
}

const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;
const OPEN_TIMELINE_MODAL_WIDTH = 1000; // px

export const OpenTimelineModal = React.memo<OpenTimelineModalProps>(({ onClose }) => (
  <EuiOverlayMask>
    <EuiModal
      data-test-subj="open-timeline-modal"
      maxWidth={OPEN_TIMELINE_MODAL_WIDTH}
      onClose={onClose}
    >
      <StatefulOpenTimeline
        closeModalTimeline={onClose}
        isModal={true}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        title={i18n.OPEN_TIMELINE_TITLE}
      />
    </EuiModal>
  </EuiOverlayMask>
));

OpenTimelineModal.displayName = 'OpenTimelineModal';
