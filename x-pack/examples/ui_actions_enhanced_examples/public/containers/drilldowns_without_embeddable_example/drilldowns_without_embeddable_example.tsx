/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiFlyout,
  EuiPopover,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { useUiActions } from '../../context';
import { SAMPLE_APP1_CLICK_TRIGGER, SampleMlJob, SampleApp1ClickContext } from '../../triggers';

export const job: SampleMlJob = {
  job_id: '123',
  job_type: 'anomaly_detector',
  description: 'This is some ML job.',
};

export const context: SampleApp1ClickContext = { job };

export const DrilldownsWithoutEmbeddableExample: React.FC = () => {
  const { plugins, managerWithoutEmbeddable } = useUiActions();
  const [showManager, setShowManager] = React.useState(false);
  const [openPopup, setOpenPopup] = React.useState(false);
  const viewRef = React.useRef<'/create' | '/manage'>('/create');

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        {
          name: 'Create new view',
          icon: 'plusInCircle',
          onClick: () => {
            setOpenPopup(false);
            viewRef.current = '/create';
            setShowManager((x) => !x);
          },
        },
        {
          name: 'Drilldown list view',
          icon: 'list',
          onClick: () => {
            setOpenPopup(false);
            viewRef.current = '/manage';
            setShowManager((x) => !x);
          },
        },
      ],
    },
  ];

  const openManagerButton = showManager ? (
    <EuiButton onClick={() => setShowManager(false)}>Close</EuiButton>
  ) : (
    <EuiPopover
      id="contextMenuExample"
      button={
        <EuiButton
          fill={!showManager}
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setOpenPopup((x) => !x)}
        >
          Open Drilldown Manager
        </EuiButton>
      }
      isOpen={openPopup}
      closePopover={() => setOpenPopup(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );

  return (
    <>
      <EuiText>
        <h3>Without embeddable example (app 1)</h3>
        <p>
          <em>Drilldown Manager</em> can be integrated into any app in Kibana. This example shows
          that drilldown manager can be used in an app which does not use embeddables and executes
          its custom UI Actions triggers.
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>{openManagerButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            fill
            iconType="play"
            iconSide="left"
            onClick={() =>
              plugins.uiActionsEnhanced.executeTriggerActions(SAMPLE_APP1_CLICK_TRIGGER, context)
            }
          >
            Execute click action
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showManager && (
        <EuiFlyout onClose={() => setShowManager(false)} aria-labelledby="Drilldown Manager">
          <plugins.uiActionsEnhanced.DrilldownManager
            key={viewRef.current}
            initialRoute={viewRef.current}
            dynamicActionManager={managerWithoutEmbeddable}
            triggers={[SAMPLE_APP1_CLICK_TRIGGER]}
            onClose={() => setShowManager(false)}
          />
        </EuiFlyout>
      )}
    </>
  );
};
