/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { useKibana } from '../../hooks/use_kibana';
import { AssetImage } from '../asset_image';

export function StreamsEmptyPrompt() {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const onboardingLocator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  return (
    <EuiEmptyPrompt
      icon={<AssetImage type="noResults" />}
      title={
        <h2>
          {i18n.translate('xpack.streams.streamsEmptyPrompt.title', {
            defaultMessage: 'No Data Streams Yet',
          })}
        </h2>
      }
      body={i18n.translate('xpack.streams.streamsEmptyPrompt.description', {
        defaultMessage:
          'Start streaming your data to Elastic to unlock powerful search, observability, and security insights. Get started by ingesting logs, metrics, or traces, or connecting cloud services.',
      })}
      actions={
        onboardingLocator
          ? [
              <EuiButton href={onboardingLocator.getRedirectUrl({})} fill>
                {i18n.translate('xpack.streams.streamsEmptyPrompt.addDataButton', {
                  defaultMessage: 'Add Data',
                })}
              </EuiButton>,
            ]
          : undefined
      }
    />
  );
}
