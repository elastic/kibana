/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

interface EisServiceDisabledCalloutProps {
  onOpenCloudConnect: () => void;
}

export const EisServiceDisabledCallout = ({
  onOpenCloudConnect,
}: EisServiceDisabledCalloutProps) => (
  <KbnDangerCallout
    size="m"
    announceOnMount={false}
    data-test-subj="eisServiceDisabledCallout"
    title={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.serviceDisabled.title', {
      defaultMessage: 'Cloud Connect is disabled',
    })}
    text={i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.serviceDisabled.description',
      {
        defaultMessage:
          'Elastic Inference Service is disabled in the Cloud Connect settings. Models provided through the service are unavailable.',
      }
    )}
    actionProps={{
      primary: {
        children: i18n.translate(
          'xpack.searchInferenceEndpoints.eisModelsPage.serviceDisabled.openCloudConnectButtonLabel',
          { defaultMessage: 'Open Cloud Connect' }
        ),
        onClick: onOpenCloudConnect,
        'data-test-subj': 'eisOpenCloudConnectButton',
      },
    }}
  />
);
