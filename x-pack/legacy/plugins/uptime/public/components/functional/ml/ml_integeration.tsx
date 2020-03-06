/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { MachineLearningFlyout } from '../../connected/ml/machine_learning_flyout';
import { UptimeSettingsContext } from '../../../contexts';

export const MLIntegrationComponent = () => {
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);

  const { license } = useContext(UptimeSettingsContext);

  const onButtonClick = () => {
    setIsMlFlyoutOpen(true);
  };

  const closeFlyout = () => {
    setIsMlFlyoutOpen(false);
  };

  return (
    <>
      <EuiButtonEmpty
        disabled={!license?.getFeature('ml')?.isAvailable}
        iconType="machineLearningApp"
        iconSide="left"
        onClick={onButtonClick}
      >
        Enable Anomaly Detection
      </EuiButtonEmpty>
      {isMlFlyoutOpen && <MachineLearningFlyout isOpen={isMlFlyoutOpen} onClose={closeFlyout} />}
    </>
  );
};
