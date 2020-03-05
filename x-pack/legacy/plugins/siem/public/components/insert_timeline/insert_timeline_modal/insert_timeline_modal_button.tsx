/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React from 'react';

export interface InsertTimelineModalButtonProps {
  onClick: () => void;
}

export const InsertTimelineModalButton = React.memo<InsertTimelineModalButtonProps>(
  ({ onClick }) => (
    <EuiButtonIcon
      color="text"
      data-test-subj="open-timeline-button"
      iconType="timeline"
      onClick={onClick}
    />
  )
);

InsertTimelineModalButton.displayName = 'InsertTimelineModalButton';
