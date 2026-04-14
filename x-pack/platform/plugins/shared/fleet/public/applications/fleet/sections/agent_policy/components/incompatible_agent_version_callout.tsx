/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export const IncompatibleAgentVersionCallout: React.FC<{
  incompatibility: 'SOME' | 'ALL';
  versionCondition?: string;
}> = ({ incompatibility, versionCondition }) => {
  return (
    <>
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.incompatibleAgentVersionTitle"
            defaultMessage="Incompatible agent version"
          />
        }
        color="warning"
      >
        {incompatibility === 'SOME' ? (
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.someIncompatibleAgentVersionWarning"
            defaultMessage="Some agents using the selected agent policy are running on a version that is not compatible with this integration. This integration requires agents on version {versionCondition}."
            values={{ versionCondition }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.allIncompatibleAgentVersionWarning"
            defaultMessage="None of the agents using the selected agent policy are compatible with this integration. This integration requires agents on version {versionCondition}."
            values={{ versionCondition }}
          />
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};
