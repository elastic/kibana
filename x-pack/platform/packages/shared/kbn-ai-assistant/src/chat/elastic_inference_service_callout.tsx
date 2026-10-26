/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { useLocalStorage } from '../hooks/use_local_storage';
import { useKibana } from '../hooks/use_kibana';

const ELASTIC_INFERENCE_SERVICE_CALLOUT_DISMISSED_KEY =
  'observabilityAIAssistant.eisCalloutDismissed';

export function ElasticInferenceServiceCallout() {
  const { application } = useKibana().services;

  const [isDismissed, setIsDismissed] = useLocalStorage(
    ELASTIC_INFERENCE_SERVICE_CALLOUT_DISMISSED_KEY,
    false
  );

  if (isDismissed) {
    return null;
  }

  const onDismiss = () => {
    setIsDismissed(true);
  };

  const onConnectClick = () => {
    application?.navigateToApp('cloud_connect', { openInNewTab: true });
  };

  return (
    <KbnInfoCallout
      title={i18n.translate('xpack.aiAssistant.eisCallout.title', {
        defaultMessage: 'Elastic Inference Service now available for self-managed clusters',
      })}
      size="m"
      onDismiss={onDismiss}
      text={i18n.translate('xpack.aiAssistant.eisCallout.description', {
        defaultMessage:
          'Connect your self-managed cluster to Elastic Cloud and use GPUs for inference tasks through the Elastic Inference Service.',
      })}
      actionProps={{
        primary: {
          onClick: onConnectClick,
          iconType: 'external',
          iconSide: 'right',
          children: i18n.translate('xpack.aiAssistant.eisCallout.connectButtonLabel', {
            defaultMessage: 'Connect this cluster',
          }),
        },
      }}
    />
  );
}
