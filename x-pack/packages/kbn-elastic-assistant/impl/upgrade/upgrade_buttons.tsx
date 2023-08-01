/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

export const UpgradeButtonsComponent = ({ basePath }: { basePath: string }) => (
  <EuiFlexGroup gutterSize="s" wrap={true} data-test-subj="upgrade-buttons">
    <EuiFlexItem grow={false}>
      <EuiButton
        href="https://www.elastic.co/subscriptions"
        iconType="popout"
        iconSide="right"
        target="_blank"
      >
        {i18n.UPGRADE_DOCS}
      </EuiButton>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        href={`${basePath}/app/management/stack/license_management`}
        iconType="gear"
        target="_blank"
      >
        {i18n.UPGRADE_CTA}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const UpgradeButtons = React.memo(UpgradeButtonsComponent);

UpgradeButtons.displayName = 'UpgradeButtons';
