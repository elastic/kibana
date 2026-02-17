/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiButton, EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { SecurityPageName } from '@kbn/deeplinks-security';
import useAsync from 'react-use/lib/useAsync';
import { AssetImage } from '../asset_image';
import { useKibana } from '../../hooks/use_kibana';

export const StreamsListEmptyPrompt = () => {
  const {
    core: { docLinks, http },
    dependencies: {
      start: { spaces, share, cloud },
    },
  } = useKibana();
  const streamsDocsLink = docLinks.links.observability.logsStreams;

  const observabilityOnboardingLocator =
    share.url.locators.get<ObservabilityOnboardingLocatorParams>(OBSERVABILITY_ONBOARDING_LOCATOR);

  // TODO: Replace with a locator when available
  const securityOnboardingLink = `/app/security/${SecurityPageName.landing}`;
  const agnosticOnboardingLink = '/app/integrations/browse';

  const spaceObservable = useMemo(() => (spaces ? spaces.getActiveSpace$() : EMPTY), [spaces]);
  const activeSpace = useObservable(spaceObservable);

  const isObservabilitySpace =
    cloud?.serverless?.projectType === 'observability' || activeSpace?.solution === 'oblt';
  const isSecuritySpace =
    cloud?.serverless?.projectType === 'security' || activeSpace?.solution === 'security';

  const onboardingLink = useAsync(async () => {
    if (observabilityOnboardingLocator && isObservabilitySpace) {
      return await observabilityOnboardingLocator.getUrl({});
    } else if (isSecuritySpace) {
      return http.basePath.prepend(securityOnboardingLink);
    }
    return http.basePath.prepend(agnosticOnboardingLink);
  }, [
    observabilityOnboardingLocator,
    isObservabilitySpace,
    isSecuritySpace,
    http.basePath,
    securityOnboardingLink,
  ]);

  return (
    <EuiEmptyPrompt
      css={{
        maxInlineSize: '960px !important',
        '.euiEmptyPrompt__content': {
          flexBasis: '35%',
        },
        '.euiEmptyPrompt__icon': {
          maxInlineSize: 'unset !important',
        },
        '.euiEmptyPrompt__icon .euiImageWrapper': {
          maxInlineSize: 'unset !important',
        },
      }}
      icon={<AssetImage type="addStreams" size="fullWidth" />}
      title={
        <h2>
          {i18n.translate('xpack.streams.emptyState.title', {
            defaultMessage: 'Turn raw data into structured, manageable streams',
          })}
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <p>
          {i18n.translate('xpack.streams.emptyState.body', {
            defaultMessage:
              "Streams provides a centralized UI that streamlines common tasks like rerouting data, extracting fields, or setting data retention, so you don't need to navigate to multiple applications or manually configure underlying Elasticsearch components.",
          })}
        </p>
      }
      actions={
        onboardingLink.value ? (
          <EuiButton color="primary" fill href={onboardingLink.value}>
            {i18n.translate('xpack.streams.emptyState.addDataButton', {
              defaultMessage: 'Add data',
            })}
          </EuiButton>
        ) : undefined
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.streams.emptyState.learnMore', {
                defaultMessage: 'Want to learn more? ',
              })}
            </span>
          </EuiTitle>{' '}
          <EuiLink href={streamsDocsLink} target="_blank">
            {i18n.translate('xpack.streams.emptyState.learnMore.link', {
              defaultMessage: ' Read our Streams documentation',
            })}
          </EuiLink>
        </>
      }
    />
  );
};
