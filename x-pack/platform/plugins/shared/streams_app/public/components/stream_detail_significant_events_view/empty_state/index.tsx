/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import noSigEventsImage from './no_sig_events.svg';

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
  return (
    <EuiEmptyPrompt
      titleSize="xs"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: 'No Significant events yet',
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
                  'Significant events runs on generated content which we use for context to create meaningful insights. Enable it for this stream.',
              })}
            </EuiText>
          </EuiFlexItem>

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
                  fill
                  color="primary"
                  isLoading={isGenerating}
                  isDisabled={isGenerateDisabled || isGenerating}
                  onClick={onGenerateSuggestionsClick}
                >
                  {isGenerating
                    ? isCanceling
                      ? CANCELING_BUTTON_LABEL
                      : GENERATING_BUTTON_LABEL
                    : GENERATE_BUTTON_LABEL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
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

const GENERATE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEvents.emptyState.generateButtonLabel',
  {
    defaultMessage: 'Generate',
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
