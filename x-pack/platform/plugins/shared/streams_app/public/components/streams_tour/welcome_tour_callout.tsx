/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBanner, EuiSpacer, type EuiBannerProps } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsTour } from './streams_tour_provider';
import { AssetImage } from '../asset_image';

interface WelcomeTourCalloutProps {
  hasClassicStreams: boolean;
  firstClassicStreamName?: string;
}

export function WelcomeTourCallout({
  hasClassicStreams,
  firstClassicStreamName,
}: WelcomeTourCalloutProps) {
  const {
    core: { docLinks, notifications },
  } = useKibana();
  const { isCalloutDismissed, dismissCallout, startTour, tourState } = useStreamsTour();

  const isTourEnabled = notifications?.tours?.isEnabled() ?? true;

  if (isCalloutDismissed || !hasClassicStreams || tourState.isTourActive) {
    return null;
  }

  const handleStartTour = () => {
    startTour(firstClassicStreamName);
  };

  const viewDocsAction: NonNullable<EuiBannerProps['actionProps']>['primary'] = {
    children: i18n.translate('xpack.streams.welcomeCallout.docsButton', {
      defaultMessage: 'View docs',
    }),
    href: docLinks.links.observability.logsStreams,
    target: '_blank',
    rel: 'noopener',
    iconType: 'external',
    iconSide: 'right',
  };

  return (
    <>
      <EuiBanner
        headingElement="h2"
        title={i18n.translate('xpack.streams.welcomeCallout.title', {
          defaultMessage:
            'Welcome to Streams, our next-generation model to manage your data in a single place',
        })}
        text={
          <>
            {i18n.translate('xpack.streams.welcomeCallout.description', {
              defaultMessage:
                'Existing Elasticsearch data streams appear in this list as classic streams, so you can manage field extraction and retention in one place.',
            })}
            <br />
            {i18n.translate('xpack.streams.welcomeCallout.descriptionSecondLine', {
              defaultMessage:
                'To try the full managed hierarchy experience, pick "Wired Streams" in the Ingestion selector when onboarding new data.',
            })}
          </>
        }
        media={<AssetImage type="yourPreviewWillAppearHere" size={140} />}
        actionProps={
          isTourEnabled
            ? {
                primary: {
                  children: i18n.translate('xpack.streams.welcomeCallout.startTourButton', {
                    defaultMessage: 'Start tour',
                  }),
                  onClick: handleStartTour,
                },
                secondary: viewDocsAction,
              }
            : {
                primary: viewDocsAction,
              }
        }
        onDismiss={dismissCallout}
        dismissButtonProps={{
          'aria-label': i18n.translate('xpack.streams.welcomeCallout.dismissButtonAriaLabel', {
            defaultMessage: "Don't show this again",
          }),
        }}
      />
      <EuiSpacer size="l" />
    </>
  );
}
