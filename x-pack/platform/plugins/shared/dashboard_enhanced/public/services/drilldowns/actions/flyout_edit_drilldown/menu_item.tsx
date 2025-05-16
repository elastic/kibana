/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React, { useMemo } from 'react';
import { FlyoutEditDrilldownActionApi } from './flyout_edit_drilldown';
import { txtDisplayName } from './i18n';

export const MenuItem = ({
  context: { embeddable },
}: {
  context: { embeddable: FlyoutEditDrilldownActionApi };
}) => {
  const dynamicActionsState = useStateFromPublishingSubject(embeddable.dynamicActionsState$);

  const count = useMemo(() => {
    return (dynamicActionsState?.dynamicActions?.events ?? []).length;
  }, [dynamicActionsState]);

  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem grow={true}>{txtDisplayName}</EuiFlexItem>
      {count > 0 && (
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{count}</EuiNotificationBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
