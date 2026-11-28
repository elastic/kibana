/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HOME_PATHS } from '../../common/constants';
import { useHomeServices, useTelemetryId } from '../context';
import { useHomeAppHref } from '../hooks/use_home_app_href';
import {
  GUIDED_API_WIZARD_TITLE,
  SAMPLE_APP_WIZARD_TITLE,
  UPLOAD_FILE_WIZARD_TITLE,
} from '../wizards/wizard_titles';

export const OnboardingWizardCards = () => {
  const { cloud } = useHomeServices();
  const getAppHref = useHomeAppHref();
  const getTelemetryId = useTelemetryId();

  const wizardCards = [
    {
      key: 'sampleApp',
      path: HOME_PATHS.sampleApp,
      title: SAMPLE_APP_WIZARD_TITLE,
      description: cloud?.isServerlessEnabled
        ? i18n.translate('xpack.elasticsearchHome.integratedHome.wizardCards.sampleAppProject', {
            defaultMessage: 'Connect your project to a working app to explore search capabilities.',
          })
        : i18n.translate('xpack.elasticsearchHome.integratedHome.wizardCards.sampleAppCluster', {
            defaultMessage: 'Connect your cluster to a working app to explore search capabilities.',
          }),
    },
    {
      key: 'guidedApi',
      path: HOME_PATHS.guidedApi,
      title: GUIDED_API_WIZARD_TITLE,
      description: i18n.translate('xpack.elasticsearchHome.integratedHome.wizardCards.guidedApi', {
        defaultMessage: 'Step-by-step guides for using the API to set up your application.',
      }),
    },
    {
      key: 'uploadFile',
      path: HOME_PATHS.uploadFile,
      title: UPLOAD_FILE_WIZARD_TITLE,
      description: i18n.translate('xpack.elasticsearchHome.integratedHome.wizardCards.uploadFile', {
        defaultMessage: 'Start searching quickly by uploading a file directly to an index.',
      }),
    },
  ];

  return (
    <EuiFlexGroup gutterSize="m" data-test-subj="elasticsearchHomeWizardCards">
      {wizardCards.map(({ key, path, title, description }) => (
        <EuiFlexItem key={key}>
          <EuiCard
            title={title}
            titleElement="h3"
            titleSize="xs"
            description={description}
            textAlign="left"
            display="subdued"
            hasBorder={false}
            href={getAppHref(path)}
            data-test-subj={`elasticsearchHomeWizardCard-${key}`}
            data-telemetry-id={getTelemetryId(`wizardCard-${key}`)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
