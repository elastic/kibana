/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
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
    core: { docLinks },
  } = useKibana();
  const { isCalloutDismissed, dismissCallout, startTour, tourState } = useStreamsTour();

  if (isCalloutDismissed || !hasClassicStreams || tourState.isTourActive) {
    return null;
  }

  const handleStartTour = () => {
    startTour(firstClassicStreamName);
  };

  return (
    <>
      <EuiPanel hasBorder paddingSize="m" color="subdued" grow={false} borderRadius="m">
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <AssetImage type="yourPreviewWillAppearHere" size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.streams.welcomeCallout.title', {
                      defaultMessage: 'Welcome to Streams',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.welcomeCallout.description', {
                    defaultMessage:
                      'Use Streams to organize and process your data into clear structured flows, and simplify routing, field extraction, and retention management.',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton color="primary" size="s" onClick={handleStartTour}>
                      {i18n.translate('xpack.streams.welcomeCallout.takeTourButton', {
                        defaultMessage: 'Take a tour',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="primary"
                      size="s"
                      href={docLinks.links.observability.logsStreams}
                      target="_blank"
                      rel="noopener"
                    >
                      {i18n.translate('xpack.streams.welcomeCallout.docsButton', {
                        defaultMessage: 'Go to docs',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="text"
                      size="s"
                      onClick={dismissCallout}
                      aria-label={i18n.translate('xpack.streams.welcomeCallout.dismissAriaLabel', {
                        defaultMessage: 'Dismiss welcome callout',
                      })}
                    >
                      {i18n.translate('xpack.streams.welcomeCallout.dismissButton', {
                        defaultMessage: 'Hide this',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="l" />
    </>
  );
}

