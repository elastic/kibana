/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiFlyout } from '@elastic/eui';
import { Section } from '../../components/section/section';
import { useUiActions } from '../../context';
import {
  UiActionsEnhancedMemoryActionStorage,
  UiActionsEnhancedDynamicActionManager,
} from '../../../../../plugins/ui_actions_enhanced/public';

export const DrilldownsManager: React.FC = () => {
  const { plugins } = useUiActions();
  const [showManager, setShowManager] = React.useState(false);

  const manager = React.useMemo(() => {
    const storage = new UiActionsEnhancedMemoryActionStorage();
    return new UiActionsEnhancedDynamicActionManager({
      storage,
      isCompatible: async () => true,
      uiActions: plugins.uiActionsEnhanced,
    });
  }, [plugins]);

  return (
    <div>
      <Section title={'Drilldowns Manager'}>
        <EuiText>
          <p>
            <em>Drilldown Manager</em> can be integrated into any app in Kibana. Click the button
            below to open the drilldown manager and see how works in this example plugin.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton fill={!showManager} onClick={() => setShowManager((x) => !x)}>
              {showManager ? 'Close' : 'Open Drilldown Manager'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Section>

      {showManager && (
        <EuiFlyout onClose={() => setShowManager(false)} aria-labelledby="Drilldown Manager">
          <plugins.uiActionsEnhanced.FlyoutManageDrilldowns
            onClose={() => setShowManager(false)}
            viewMode={'create'}
            dynamicActionManager={manager}
            triggers={['VALUE_CLICK_TRIGGER', 'SELECT_RANGE_TRIGGER']}
          />
        </EuiFlyout>
      )}
    </div>
  );
};
