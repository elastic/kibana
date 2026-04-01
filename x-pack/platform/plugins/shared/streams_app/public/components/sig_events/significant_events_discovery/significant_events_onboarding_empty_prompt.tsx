/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiLink, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AssetImage } from '../../asset_image';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';

export const SignificantEventsOnboardingEmptyPrompt = () => {
  const router = useStreamsAppRouter();
  const {
    core: { docLinks },
  } = useKibana();

  const managerStreamsHref = router.link('/_discovery/manage/{tab}', {
    path: { tab: 'streams' },
  });

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
      icon={<AssetImage type="sigEventsOnboarding" size="fullWidth" />}
      title={<h2>{TITLE}</h2>}
      layout="horizontal"
      color="plain"
      body={<p>{DESCRIPTION}</p>}
      actions={
        <EuiButton color="primary" fill href={managerStreamsHref}>
          {ONBOARD_STREAMS_BUTTON}
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>{FOOTER_LEARN_MORE}</span>
          </EuiTitle>{' '}
          <EuiLink href={docLinks.links.observability.logsStreams} target="_blank">
            {FOOTER_READ_MORE}
          </EuiLink>
        </>
      }
    />
  );
};

const TITLE = i18n.translate(
  'xpack.streams.sigEventsDiscovery.onboardingEmptyPrompt.title',
  { defaultMessage: 'Enable Significant events' }
);

const DESCRIPTION = i18n.translate(
  'xpack.streams.sigEventsDiscovery.onboardingEmptyPrompt.description',
  {
    defaultMessage:
      'Get insights into the performance, error handling, data optimisation and current topology mapping and other insights that contribute to a great end-user experience for your system and architecture.',
  }
);

const ONBOARD_STREAMS_BUTTON = i18n.translate(
  'xpack.streams.sigEventsDiscovery.onboardingEmptyPrompt.onboardStreamsButton',
  { defaultMessage: 'Onboard streams' }
);

const FOOTER_LEARN_MORE = i18n.translate(
  'xpack.streams.sigEventsDiscovery.onboardingEmptyPrompt.footerLearnMore',
  { defaultMessage: 'Want to learn more?' }
);

const FOOTER_READ_MORE = i18n.translate(
  'xpack.streams.sigEventsDiscovery.onboardingEmptyPrompt.footerReadMore',
  { defaultMessage: 'Read our documentation' }
);
