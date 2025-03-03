/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTourStep } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { TOUR_STORAGE_CONFIG } from '../../../constants';
import { TOUR_STORAGE_KEYS } from '../../../constants';
import { useStartServices } from '../../../hooks';

export const AutoUpgradeAgentsTour: React.FC<{ anchor: string }> = ({ anchor }) => {
  const { storage, uiSettings } = useStartServices();

  const [tourState, setTourState] = useState({ isOpen: true });

  const isTourHidden =
    uiSettings.get('hideAnnouncements', false) ||
    (
      storage.get(TOUR_STORAGE_KEYS.AUTO_UPGRADE_AGENTS) as
        | TOUR_STORAGE_CONFIG['AUTO_UPGRADE_AGENTS']
        | undefined
    )?.active === false;

  const setTourAsHidden = () => {
    storage.set(TOUR_STORAGE_KEYS.AUTO_UPGRADE_AGENTS, {
      active: false,
    } as TOUR_STORAGE_CONFIG['AUTO_UPGRADE_AGENTS']);
  };

  const onFinish = () => {
    setTourState({ isOpen: false });
    setTourAsHidden();
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
        isStepOpen={!isTourHidden && tourState.isOpen}
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
        anchor={anchor}
      />
    </>
  );
};
