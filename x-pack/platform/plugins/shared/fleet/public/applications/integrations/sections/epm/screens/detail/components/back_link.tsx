/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { useStartServices } from '../../../../../../../hooks';

interface Props {
  queryParams: URLSearchParams;
  integrationsPath: string;
}

export function BackLink({ queryParams, integrationsPath }: Props) {
  const {
    application: { navigateToApp },
  } = useStartServices();
  const { returnAppId, returnPath } = useMemo(() => {
    return {
      // Check for custom path params to redirect back to a specified app's path
      returnAppId: queryParams.get('returnAppId'),
      returnPath: queryParams.get('returnPath'),
    };
  }, [queryParams]);

  const appId = returnAppId && returnPath ? returnAppId : 'integrations';
  const path = returnAppId && returnPath ? returnPath : integrationsPath;

  const message = returnPath ? BACK_TO_SELECTION : BACK_TO_INTEGRATIONS;

  return (
    <>
      <EuiButtonEmpty
        iconType="arrowLeft"
        size="xs"
        flush="left"
        onClick={() => {
          navigateToApp(appId, { path });
        }}
      >
        {message}
      </EuiButtonEmpty>
    </>
  );
}

const BACK_TO_INTEGRATIONS = (
  <FormattedMessage
    id="xpack.fleet.epm.browseAllButtonText"
    defaultMessage="Back to integrations"
  />
);

const BACK_TO_SELECTION = (
  <FormattedMessage
    id="xpack.fleet.epm.returnToObservabilityOnboarding"
    defaultMessage="Back to selection"
  />
);
