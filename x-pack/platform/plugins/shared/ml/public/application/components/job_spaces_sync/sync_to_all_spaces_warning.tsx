/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiText } from '@elastic/eui';
import { useMlKibana } from '../../contexts/kibana/kibana_context';

export const SyncToAllSpacesWarning: FC = () => {
  const {
    services: {
      docLinks: { links },
    },
  } = useMlKibana();
  const docLink = links.security.kibanaPrivileges;
  return (
    <EuiCallOut
      size="s"
      iconType="question"
      title={
        <FormattedMessage
          id="xpack.ml.management.syncSavedObjectsFlyout.allSpacesWarning.title"
          defaultMessage="Sync can only add items to the current space"
        />
      }
      color="warning"
    >
      <EuiText size="s">
        <FormattedMessage
          id="xpack.ml.management.syncSavedObjectsFlyout.allSpacesWarning.description"
          defaultMessage="Without {readAndWritePrivilegesLink} for all spaces you can only add jobs and trained models to the current space when syncing."
          values={{
            readAndWritePrivilegesLink: (
              <EuiLink href={docLink} target="_blank">
                <FormattedMessage
                  id="xpack.ml.management.syncSavedObjectsFlyout.privilegeWarningLink"
                  defaultMessage="read and write privileges"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
};
