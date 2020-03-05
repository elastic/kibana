/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React from 'react';
import * as i18n from '../translations';

export interface InsertTimelinePopoverButtonProps {
  onClick: () => void;
}

export const InsertTimelinePopoverButton = React.memo<InsertTimelinePopoverButtonProps>(
  ({ onClick }) => (
    <EuiButtonIcon
      aria-label={i18n.INSERT_TIMELINE}
      data-test-subj="insert-timeline-button"
      iconType="timeline"
      onClick={onClick}
    />
  )
);

InsertTimelinePopoverButton.displayName = 'InsertTimelinePopoverButton';
