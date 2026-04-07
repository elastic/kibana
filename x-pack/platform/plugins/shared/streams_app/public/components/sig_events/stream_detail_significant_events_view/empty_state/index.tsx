/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import noSigEventsImage from './no_sig_events.svg';

const ML_MODEL_SETTINGS_PATH = '/ml/model_settings';
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export function EmptyState({
  isGenerating,
  isCanceling,
  isGenerateDisabled,
  onCancelGenerationClick,
  onGenerateSuggestionsClick,
}: {
  isGenerating: boolean;
  isCanceling: boolean;
  isGenerateDisabled: boolean;
  onCancelGenerationClick: () => void;
  onGenerateSuggestionsClick: () => void;
}) {
  const { core } = useKibana();
  const defaultConnector = core.uiSettings.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);

  const isDefaultAiConnectorMissing =
    !defaultConnector || defaultConnector === NO_DEFAULT_CONNECTOR;
  const genAiSettingsUrl = core.application.getUrlForApp('management', {
    path: ML_MODEL_SETTINGS_PATH,
  });

  return (
    <EuiEmptyPrompt
      titleSize="xs"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: "This stream's knowledge indicators have not been extracted yet",
          })}
        </h2>
      }
      icon={
        <EuiImage
          src={noSigEventsImage}
          alt={NO_SIGNIFICANT_EVENTS_IMAGE_ALT}
          size={240}
          hasShadow={false}
        />
      }
      body={
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <EuiText size="s" textAlign="center" color="subdued">
              {i18n.translate('xpack.streams.significantEvents.emptyState.description', {
                defaultMessage:
                  'Generate knowledge indicators to teach the system about this stream. These indicators are the foundation for detecting significant events.',
              })}
            </EuiText>
          </EuiFlexItem>
          {isDefaultAiConnectorMissing ? (
            <EuiFlexItem>
              <EuiCallOut
                announceOnMount
                title={NO_DEFAULT_CONNECTOR_CALLOUT_TITLE}
                color="warning"
                iconType="warning"
              >
                <p>
                  {NO_DEFAULT_CONNECTOR_CALLOUT_DESCRIPTION}{' '}
                  <EuiLink href={genAiSettingsUrl} external>
                    {NO_DEFAULT_CONNECTOR_CALLOUT_LINK_LABEL}
                  </EuiLink>
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          ) : (
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false}>
                {isGenerating ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      aria-label={CANCEL_GENERATION_BUTTON_ARIA_LABEL}
                      iconType="stop"
                      onClick={onCancelGenerationClick}
                    />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="m"
                    color="primary"
                    isLoading={isGenerating}
                    isDisabled={isGenerateDisabled || isGenerating}
                    onClick={onGenerateSuggestionsClick}
                  >
                    {isGenerating
                      ? isCanceling
                        ? CANCELING_BUTTON_LABEL
                        : GENERATING_BUTTON_LABEL
                      : ONBOARD_STREAM_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
}

const NO_SIGNIFICANT_EVENTS_IMAGE_ALT = i18n.translate(
  'xpack.streams.significantEvents.emptyState.imageAlt',
  {
    defaultMessage: 'No significant events illustration',
  }
);

const ONBOARD_STREAM_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEvents.emptyState.onboardStreamButtonLabel',
  {
    defaultMessage: 'Generate knowledge indicators',
  }
);

const GENERATING_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEvents.emptyState.generatingButtonLabel',
  {
    defaultMessage: 'Generating',
  }
);

const CANCELING_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEvents.emptyState.cancelingButtonLabel',
  {
    defaultMessage: 'Canceling',
  }
);

const CANCEL_GENERATION_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEvents.emptyState.cancelGenerationButtonAriaLabel',
  {
    defaultMessage: 'Cancel generation',
  }
);

const NO_DEFAULT_CONNECTOR_CALLOUT_TITLE = i18n.translate(
  'xpack.streams.significantEvents.emptyState.noDefaultConnectorCalloutTitle',
  {
    defaultMessage: 'No default connector configured',
  }
);

const NO_DEFAULT_CONNECTOR_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEvents.emptyState.noDefaultConnectorCalloutDescription',
  {
    defaultMessage:
      'Generating significant events requires a default AI connector. Open Model Settings to configure one.',
  }
);

const NO_DEFAULT_CONNECTOR_CALLOUT_LINK_LABEL = i18n.translate(
  'xpack.streams.significantEvents.emptyState.noDefaultConnectorCalloutLinkLabel',
  {
    defaultMessage: 'Open Model Settings',
  }
);
