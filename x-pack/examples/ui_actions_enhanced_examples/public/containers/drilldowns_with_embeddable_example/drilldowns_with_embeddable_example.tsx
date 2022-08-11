/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { EmbeddableRoot, VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { SampleMlJob, SampleApp1ClickContext } from '../../triggers';
import { ButtonEmbeddable } from '../../embeddables/button_embeddable';
import { useUiActions } from '../../context';

export const job: SampleMlJob = {
  job_id: '123',
  job_type: 'anomaly_detector',
  description: 'This is some ML job.',
};

export const context: SampleApp1ClickContext = { job };

export const DrilldownsWithEmbeddableExample: React.FC = () => {
  const { plugins, managerWithEmbeddable } = useUiActions();
  const embeddable = React.useMemo(
    () =>
      new ButtonEmbeddable(
        { id: 'DrilldownsWithEmbeddableExample' },
        { uiActions: plugins.uiActionsEnhanced }
      ),
    [plugins.uiActionsEnhanced]
  );
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
        <h3>With embeddable example</h3>
        <p>
          This example shows how drilldown manager can be added to an embeddable which executes{' '}
          <EuiCode>VALUE_CLICK_TRIGGER</EuiCode> trigger. Below card is an embeddable which executes
          <EuiCode>VALUE_CLICK_TRIGGER</EuiCode> when it is clicked on.
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>{openManagerButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div style={{ maxWidth: 200 }}>
            <EmbeddableRoot embeddable={embeddable} />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showManager && (
        <EuiFlyout onClose={() => setShowManager(false)} aria-labelledby="Drilldown Manager">
          <plugins.uiActionsEnhanced.DrilldownManager
            key={viewRef.current}
            initialRoute={viewRef.current}
            dynamicActionManager={managerWithEmbeddable}
            triggers={[VALUE_CLICK_TRIGGER]}
            placeContext={{ embeddable }}
            onClose={() => setShowManager(false)}
          />
        </EuiFlyout>
      )}
    </>
  );
};
