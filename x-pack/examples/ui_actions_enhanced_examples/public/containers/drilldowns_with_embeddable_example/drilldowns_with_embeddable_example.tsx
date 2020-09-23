/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiContextMenuPanelDescriptor,
  EuiButton,
  EuiPopover,
  EuiContextMenu,
  EuiFlyout,
  EuiCode,
} from '@elastic/eui';
import { SampleMlJob, SampleMlJobClickContext } from '../../triggers';
import { EmbeddableRoot } from '../../../../../../src/plugins/embeddable/public';
import { ButtonEmbeddable } from '../../embeddables/button_embeddable';
import { useUiActions } from '../../context';
import { VALUE_CLICK_TRIGGER } from '../../../../../../src/plugins/ui_actions/public';

export const job: SampleMlJob = {
  job_id: '123',
  job_type: 'anomaly_detector',
  description: 'This is some ML job.',
};

export const context: SampleMlJobClickContext = { job };

export const DrilldownsWithEmbeddableExample: React.FC = () => {
  const embeddable = React.useMemo(
    () => new ButtonEmbeddable({ id: 'DrilldownsWithEmbeddableExample' }, {}),
    []
  );
  const { plugins, manager } = useUiActions();
  const [showManager, setShowManager] = React.useState(false);
  const [openPopup, setOpenPopup] = React.useState(false);
  const viewRef = React.useRef<'create' | 'manage'>('create');

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        {
          name: 'Create new view',
          icon: 'plusInCircle',
          onClick: () => {
            setOpenPopup(false);
            viewRef.current = 'create';
            setShowManager((x) => !x);
          },
        },
        {
          name: 'Drilldown list view',
          icon: 'list',
          onClick: () => {
            setOpenPopup(false);
            viewRef.current = 'manage';
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
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );

  return (
    <>
      <EuiText>
        <h3>With embeddable example</h3>
        <p>
          This example shows how drilldown manager can be added to an embeddable which executes{' '}
          <EuiCode>VALUE_CLICK_TRIGGER</EuiCode> trigger.
        </p>
      </EuiText>

      <EuiSpacer />

      {openManagerButton}

      <EuiSpacer />

      <div style={{ maxWidth: 200 }}>
        <EmbeddableRoot embeddable={embeddable} />
      </div>

      {showManager && (
        <EuiFlyout onClose={() => setShowManager(false)} aria-labelledby="Drilldown Manager">
          <plugins.uiActionsEnhanced.FlyoutManageDrilldowns
            onClose={() => setShowManager(false)}
            viewMode={viewRef.current}
            dynamicActionManager={manager}
            triggers={[VALUE_CLICK_TRIGGER]}
          />
        </EuiFlyout>
      )}
    </>
  );
};
