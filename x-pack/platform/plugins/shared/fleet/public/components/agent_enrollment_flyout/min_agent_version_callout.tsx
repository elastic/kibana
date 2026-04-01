/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const MinAgentVersionCallout: React.FC<{ minVersion: string }> = ({ minVersion }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.minAgentVersionCallout.title"
            defaultMessage="Agent version requirement"
          />
        }
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.minAgentVersionCallout.body"
          defaultMessage="This policy contains integrations that require Elastic Agent {minVersion} or later. Enrolling an agent on an earlier version can result in unexpected or broken functionality."
          values={{ minVersion }}
        />
      </EuiCallOut>
    </>
  );
};
