/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTourStep, EuiButtonEmpty } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useGlobalFleetTours } from '../../../../../hooks';

export const AutoUpgradeAgentsTour: React.FC<{ anchor: string }> = ({ anchor }) => {
  const { shouldShowTour, nextTour } = useGlobalFleetTours('AUTO_UPGRADE_AGENTS', {
    isConditionMet: () => true, // Always available on agent policy tab
  });

  const [tourState, setTourState] = useState({ isOpen: true });
  const onFinish = () => {
    setTourState({ isOpen: false });
    nextTour();
  };

  return (
    <>
      <EuiTourStep
        content={
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.autoUpgradeAgentsTour.tourContent"
              defaultMessage="Select your policy and configure target agent versions for automatic upgrades."
            />
          </EuiText>
        }
        isStepOpen={shouldShowTour() && tourState.isOpen}
        onFinish={onFinish}
        minWidth={360}
        maxWidth={360}
        step={1}
        stepsTotal={1}
        title={
          <FormattedMessage
            id="xpack.fleet.autoUpgradeAgentsTour.tourTitle"
            defaultMessage="Auto-upgrade agents"
          />
        }
        anchorPosition="downLeft"
        footerAction={
          <EuiButtonEmpty onClick={onFinish}>
            <FormattedMessage id="xpack.fleet.tour.finishButton" defaultMessage="Finish" />
          </EuiButtonEmpty>
        }
        anchor={anchor}
      />
    </>
  );
};
