/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiPageTemplate } from '@elastic/eui';
import { createPermissionFailureMessage } from '../capabilities/check_capabilities';
import type { MlCapabilitiesKey } from '../../../common/types/capabilities';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana } from '../contexts/kibana';

export interface AccessDeniedCalloutProps {
  missingCapabilities?: MlCapabilitiesKey[];
}

export const AccessDeniedCallout: FC<AccessDeniedCalloutProps> = ({ missingCapabilities }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const errorMessages = (missingCapabilities ?? []).map((c) => createPermissionFailureMessage(c));

  return (
    <>
      <EuiPageTemplate.EmptyPrompt
        color={'danger'}
        alignment={'horizontalCenter'}
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ml.management.jobsList.accessDeniedTitle"
              defaultMessage="Access denied"
            />
          </h2>
        }
        body={
          <div>
            <FormattedMessage
              id="xpack.ml.accessDenied.description"
              defaultMessage="You do not have permission to view this page."
            />
            {errorMessages ? (
              <ul>
                {errorMessages.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            ) : null}
          </div>
        }
      />
      <HelpMenu docLink={helpLink} />
    </>
  );
};
