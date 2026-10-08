/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';

import { useUpgradeCheck } from '../../capabilities/check_capabilities';

export const UpgradeWarning: FC = () => {
  const isUpgradeInProgress = useUpgradeCheck();

  if (isUpgradeInProgress === true) {
    return (
      <React.Fragment>
        <KbnWarningCallout
          announceOnMount={false}
          title={
            <FormattedMessage
              id="xpack.ml.upgrade.upgradeWarning.upgradeInProgressWarningTitle"
              defaultMessage="Index migration in progress"
            />
          }
          text={
            <p>
              <FormattedMessage
                id="xpack.ml.upgrade.upgradeWarning.upgradeInProgressWarningDescription"
                defaultMessage="Indices related to Machine Learning are currently being upgraded."
              />
              <br />
              <FormattedMessage
                id="xpack.ml.upgrade.upgradeWarning.upgradeInProgressWarningDescriptionExtra"
                defaultMessage="Some actions will not be available during this time."
              />
            </p>
          }
        />
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  }

  return null;
};
