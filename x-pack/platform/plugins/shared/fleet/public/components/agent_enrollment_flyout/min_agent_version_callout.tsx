/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';

export const MinAgentVersionCallout: React.FC<{ minVersion: string }> = ({ minVersion }) => {
  return (
    <>
      <EuiSpacer size="m" />
      <KbnWarningCallout
        title={
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.minAgentVersionCallout.title"
            defaultMessage="Agent version requirement"
          />
        }
        text={
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.minAgentVersionCallout.body"
            defaultMessage="This policy contains integrations that require Elastic Agent {minVersion} or later. Enrolling an agent on an earlier version can result in unexpected or broken functionality."
            values={{ minVersion }}
          />
        }
      />
    </>
  );
};
