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
}> = ({ incompatibility }) => {
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
            defaultMessage="Some agents using the selected agent policy are running on a version that is not compatible with this integration."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.StepSelectPolicy.allIncompatibleAgentVersionWarning"
            defaultMessage="The selected agent policies have no agents in a version compatible with the integration."
          />
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  );
};
