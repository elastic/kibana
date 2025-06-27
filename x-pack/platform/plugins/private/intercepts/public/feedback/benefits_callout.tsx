/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const ELASTIC_SUPPORT_LINK = 'https://support.elastic.co/';

export const BenefitsCallout = () => (
  <>
    <EuiSpacer size="m" />
    <EuiCallOut
      color="warning"
      title={
        <FormattedMessage
          id="xpack.intercept.feedbackFlyout.platinumOrHigherCallout.title"
          defaultMessage="Use your Platinum license benefits instead"
        />
      }
    >
      <FormattedMessage
        id="xpack.intercept.feedbackFlyout.platinumOrHigherCallout.content"
        defaultMessage="Please submit your improvement request in the dedicated {supportLink} so we can get back to you faster."
        values={{
          supportLink: (
            <EuiLink href={ELASTIC_SUPPORT_LINK} target="_blank" external={true}>
              <FormattedMessage
                id="xpack.intercept.feedbackFlyout.platinumOrHigherCallout.supportLink"
                defaultMessage="support channel"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
    <EuiSpacer size="m" />
  </>
);
