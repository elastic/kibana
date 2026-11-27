/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface ShowMoreActivitiesProps {
  count: number;
  onClick: () => void;
  isLoading?: boolean;
}

export const ShowMoreActivities = React.memo<ShowMoreActivitiesProps>(
  ({ count, onClick, isLoading = false }) => (
    <EuiButtonEmpty
      size="s"
      flush="left"
      iconType="maximize"
      onClick={onClick}
      isLoading={isLoading}
      data-test-subj="cases-show-more-user-actions"
    >
      {i18n.SHOW_MORE_ACTIVITIES(count)}
    </EuiButtonEmpty>
  )
);

ShowMoreActivities.displayName = 'ShowMoreActivities';
