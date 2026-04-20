/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import {
  AiButton,
  AiButtonIcon,
  type AiButtonDefaultProps,
  type AiButtonIconType,
} from '@kbn/shared-ux-ai-components';
import React from 'react';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { EnableAIFeaturesLink } from '../enable_ai_features_link/enable_ai_features_link';
import { ConnectorPickerPopover } from './connector_picker_popover';

const CHOOSE_CONNECTOR_ARIA_LABEL = i18n.translate(
  'xpack.streams.connectorListButton.chooseConnectorButtonLabel',
  {
    defaultMessage: 'Choose connector',
  }
);

const splitButtonPrimaryStyles = css`
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
`;

const splitButtonSecondaryStyles = css`
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
`;

export function ConnectorListButtonBase({
  buttonProps,
  aiFeatures,
  showConnectorSelector = true,
}: {
  buttonProps: AiButtonDefaultProps;
  aiFeatures: Pick<AIFeatures, 'couldBeEnabled' | 'enabled' | 'genAiConnectors'> | null;
  showConnectorSelector?: boolean;
}) {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  const { fill, size, iconType, ...restButtonProps } = buttonProps;
  const buttonSize = size ?? 's';

  if (aiFeatures === null) {
    return <EuiLoadingSpinner size={buttonSize === 'xs' ? 's' : buttonSize} />;
  }

  if (!aiFeatures.enabled) {
    if (aiFeatures.couldBeEnabled) {
      return <EnableAIFeaturesLink />;
    }
    return null;
  }

  const connectorsResult = aiFeatures.genAiConnectors;
  const hasMultipleConnectors =
    connectorsResult?.connectors && connectorsResult.connectors.length >= 2;

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="xs"
      alignItems="center"
      css={`
        flex-grow: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <AiButton
          className={
            showConnectorSelector && hasMultipleConnectors ? splitButtonPrimaryStyles : undefined
          }
          isDisabled={!connectorsResult?.connectors?.length}
          isLoading={connectorsResult?.loading}
          size={buttonSize}
          iconType={iconType}
          {...restButtonProps}
        />
      </EuiFlexItem>
      {showConnectorSelector && hasMultipleConnectors && (
        <EuiFlexItem grow={false}>
          <ConnectorPickerPopover
            id={splitButtonPopoverId}
            aria-label={CHOOSE_CONNECTOR_ARIA_LABEL}
            connectors={connectorsResult}
            isOpen={isPopoverOpen}
            onClose={closePopover}
            button={
              <AiButtonIcon
                className={splitButtonSecondaryStyles}
                data-test-subj="streamsAppAiPickConnectorButton"
                onClick={togglePopover}
                size={buttonSize}
                iconType={'gear' as AiButtonIconType}
                aria-label={CHOOSE_CONNECTOR_ARIA_LABEL}
              />
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export function ConnectorListButton({ buttonProps }: { buttonProps: AiButtonDefaultProps }) {
  const aiFeatures = useAIFeatures();

  return <ConnectorListButtonBase buttonProps={buttonProps} aiFeatures={aiFeatures} />;
}
