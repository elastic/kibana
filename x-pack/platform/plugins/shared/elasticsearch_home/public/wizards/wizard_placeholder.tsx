/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { HOME_PATHS } from '../../common/constants';
import { useHomeConfig, useTelemetryId } from '../context';
import { useHomeAppHref } from '../hooks/use_home_app_href';

interface WizardPlaceholderProps {
  title: string;
  testSubj: string;
}

export const WizardPlaceholder = ({ title, testSubj }: WizardPlaceholderProps) => {
  const { solutionNav } = useHomeConfig();
  const getTelemetryId = useTelemetryId();
  const getAppHref = useHomeAppHref();
  const homeHref = getAppHref(HOME_PATHS.home);

  return (
    <KibanaPageTemplate solutionNav={solutionNav} data-test-subj={testSubj}>
      <AppHeader
        title={title}
        back={{
          href: homeHref,
          label: i18n.translate('xpack.elasticsearchHome.wizards.header.backLabel', {
            defaultMessage: 'Home',
          }),
        }}
      />
      <KibanaPageTemplate.EmptyPrompt
        iconType="rocket"
        title={<h2>{title}</h2>}
        body={
          <p>
            {i18n.translate('xpack.elasticsearchHome.wizards.placeholder.body', {
              defaultMessage: 'This guide is coming soon.',
            })}
          </p>
        }
        actions={
          <EuiButton
            href={homeHref}
            data-test-subj="elasticsearchHomeWizardBackButton"
            data-telemetry-id={getTelemetryId('wizard-backToHome')}
          >
            {i18n.translate('xpack.elasticsearchHome.wizards.placeholder.backButton', {
              defaultMessage: 'Back to home',
            })}
          </EuiButton>
        }
      />
    </KibanaPageTemplate>
  );
};
