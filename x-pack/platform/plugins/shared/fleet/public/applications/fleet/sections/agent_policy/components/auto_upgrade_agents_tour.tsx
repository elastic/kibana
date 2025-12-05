/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useDismissableTour } from '../../../hooks';

export const AutoUpgradeAgentsTour: React.FC<{ anchor: string }> = ({ anchor }) => {
  const { isOpen, dismiss } = useDismissableTour('AUTO_UPGRADE_AGENTS');

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
        isStepOpen={isOpen}
        onFinish={dismiss}
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
        footerAction={
          <EuiButtonEmpty onClick={dismiss}>
            <FormattedMessage
              id="xpack.fleet.genericTourPopover.dismissButton"
              defaultMessage="Got it"
            />
          </EuiButtonEmpty>
        }
        anchorPosition="downLeft"
        anchor={anchor}
      />
    </>
  );
};
