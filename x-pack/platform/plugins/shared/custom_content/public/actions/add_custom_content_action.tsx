/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ADD_PANEL_VISUALIZATION_GROUP } from '@kbn/embeddable-plugin/public';
import {
  apiIsPresentationContainer,
  hasEditCapabilities,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { CustomContentIcon } from './custom_content_icon';
import { ADD_CUSTOM_CONTENT_ACTION_ID } from '../../common/constants';
import { getTelemetry } from '../telemetry';

const displayName = i18n.translate('xpack.customContent.addPanel.displayName', {
  defaultMessage: 'Custom',
});

const CustomContentMenuItem: React.FC<{ context: EmbeddableApiContext }> = () => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
    <EuiFlexItem grow={false}>{displayName}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="accent">
        <FormattedMessage id="xpack.customContent.addPanel.newBadgeLabel" defaultMessage="New" />
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const getAddCustomContentAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_CUSTOM_CONTENT_ACTION_ID,
  grouping: [ADD_PANEL_VISUALIZATION_GROUP],
  order: -1,
  getIconType: () => CustomContentIcon,
  MenuItem: CustomContentMenuItem,
  isCompatible: async ({ embeddable }) => apiIsPresentationContainer(embeddable),
  execute: async ({ embeddable, returnFocus }) => {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();

    getTelemetry().trackPanelAdded('dashboard_panel');

    const panelApi = await embeddable.addNewPanel(
      {
        panelType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        serializedState: { template: undefined },
      },
      { displaySuccessMessage: false }
    );

    if (panelApi && hasEditCapabilities(panelApi)) {
      await panelApi.onEdit({ isNewPanel: true, returnFocus });
    }
  },
  getDisplayName: () => displayName,
});
