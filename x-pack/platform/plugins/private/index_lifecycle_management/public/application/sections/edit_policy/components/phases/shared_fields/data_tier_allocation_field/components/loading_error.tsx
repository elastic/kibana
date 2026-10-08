/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

interface Props {
  onResendRequest: () => void;
  statusCode?: string | number;
  message?: string;
}

export const LoadingError: FunctionComponent<Props> = ({
  statusCode,
  message,
  onResendRequest,
}) => {
  return (
    <>
      <EuiSpacer size="s" />

      <KbnDangerCallout
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesLoadingFailedTitle"
            defaultMessage="Unable to load node data"
          />
        }
        text={
          <p>
            {message} ({statusCode})
          </p>
        }
        actionProps={{
          primary: {
            onClick: onResendRequest,
            iconType: 'refresh',
            children: (
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesReloadButton"
                defaultMessage="Try again"
              />
            ),
          },
        }}
      />

      <EuiSpacer size="xl" />
    </>
  );
};
