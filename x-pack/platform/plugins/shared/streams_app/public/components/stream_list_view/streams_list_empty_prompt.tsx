/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiButton, EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { AssetImage } from '../asset_image';
import { useKibana } from '../../hooks/use_kibana';
import { useOnboardingLink } from '../../hooks/use_onboarding_link';

export const StreamsListEmptyPrompt = () => {
  const {
    core: { docLinks },
  } = useKibana();
  const streamsDocsLink = docLinks.links.observability.logsStreams;

  const onboardingLink = useOnboardingLink();

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
        <EuiButton color="primary" fill href={onboardingLink}>
          {i18n.translate('xpack.streams.emptyState.addDataButton', {
            defaultMessage: 'Add data',
          })}
        </EuiButton>
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
