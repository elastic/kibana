/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';

import { EuiPopover, EuiButtonEmpty, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { MachineLearningFlyout } from '../../connected/ml/machine_learning_flyout';
import { UptimeSettingsContext } from '../../../contexts';

export const MLIntegrationComponent = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);

  const { license } = useContext(UptimeSettingsContext);

  const onButtonClick = () => {
    setIsPopoverOpen(true);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const closeFlyout = () => {
    setIsMlFlyoutOpen(false);
  };

  const button = (
    <EuiButtonEmpty
      disabled={!license?.getFeature('ml')?.isAvailable}
      iconType="machineLearningApp"
      iconSide="right"
      onClick={onButtonClick}
    >
      ML Integrations
    </EuiButtonEmpty>
  );

  const items = [
    <EuiContextMenuItem
      key="mlIntegrations"
      icon="machineLearningApp"
      onClick={() => {
        setIsMlFlyoutOpen(true);
        setIsPopoverOpen(false);
      }}
    >
      Enable Duration Anomaly Detection
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover id="popover" button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      {isMlFlyoutOpen && <MachineLearningFlyout isOpen={isMlFlyoutOpen} onClose={closeFlyout} />}
    </>
  );
};
