/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { useStartServices } from '../../../../../../../hooks';

interface Props {
  queryParams: URLSearchParams;
  integrationsPath: string;
  collectionTitle?: string;
}

export function BackLink({ queryParams, integrationsPath, collectionTitle }: Props) {
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

  // collectionTitle takes full priority: suppress the returnPath/returnAppId override so the
  // label ("Back to X collection") and the click destination always agree.
  const useReturnPath = !collectionTitle && returnAppId && returnPath;
  const appId = useReturnPath ? returnAppId : 'integrations';
  const path = useReturnPath ? returnPath : integrationsPath;

  // Maintain 'Back to integrations' for the AI4SOC integrations page
  const message = collectionTitle
    ? i18n.translate('xpack.fleet.epm.backToCollectionText', {
        defaultMessage: 'Back to {collectionTitle} collection',
        values: { collectionTitle },
      })
    : !returnPath || returnPath.includes('/configurations/integrations')
    ? BACK_TO_INTEGRATIONS
    : BACK_TO_SELECTION;

  return (
    <>
      <EuiButtonEmpty
        iconType="chevronSingleLeft"
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
