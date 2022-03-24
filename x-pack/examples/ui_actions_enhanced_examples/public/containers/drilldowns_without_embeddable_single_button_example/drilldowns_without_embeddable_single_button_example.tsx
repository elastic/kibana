/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiFlyout } from '@elastic/eui';
import { useUiActions } from '../../context';
import { sampleApp2ClickContext, SAMPLE_APP2_CLICK_TRIGGER } from '../../triggers';

export const DrilldownsWithoutEmbeddableSingleButtonExample: React.FC = () => {
  const { plugins, managerWithoutEmbeddableSingleButton } = useUiActions();
  const [showManager, setShowManager] = React.useState(false);

  return (
    <>
      <EuiText>
        <h3>Without embeddable example, single button (app 2)</h3>
        <p>
          This example is the same as <em>Without embeddable example</em> but it shows that
          drilldown manager actions and user created drilldowns can be combined in one menu, this is
          useful, for example, for Canvas where clicking on a Canvas element would show the combined
          menu of drilldown manager actions and drilldown actions.
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            fill
            iconType="play"
            iconSide="left"
            onClick={() =>
              plugins.uiActionsEnhanced.executeTriggerActions(
                SAMPLE_APP2_CLICK_TRIGGER,
                sampleApp2ClickContext
              )
            }
          >
            Click this element
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showManager && (
        <EuiFlyout onClose={() => setShowManager(false)} aria-labelledby="Drilldown Manager">
          <plugins.uiActionsEnhanced.DrilldownManager
            initialRoute={'/create'}
            dynamicActionManager={managerWithoutEmbeddableSingleButton}
            triggers={[SAMPLE_APP2_CLICK_TRIGGER]}
            onClose={() => setShowManager(false)}
          />
        </EuiFlyout>
      )}
    </>
  );
};
