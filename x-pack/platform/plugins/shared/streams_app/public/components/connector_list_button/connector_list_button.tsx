/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiButtonProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { EnableAIFeaturesLink } from '../enable_ai_features_link/enable_ai_features_link';

const SHOW_MORE_ARIA_LABEL = i18n.translate(
  'xpack.streams.connectorListButton.showMoreButtonLabel',
  {
    defaultMessage: 'More',
  }
);

export function ConnectorListButtonBase({
  buttonProps,
  aiFeatures,
}: {
  buttonProps: EuiButtonProps & { onClick?: () => void };
  aiFeatures: Pick<AIFeatures, 'couldBeEnabled' | 'enabled' | 'genAiConnectors'> | null;
}) {
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });

  const buttonSize = buttonProps.size ?? 's';
  const fill = buttonProps.fill ?? false;

  if (aiFeatures === null) {
    return <EuiLoadingSpinner size={buttonSize} />;
  }

  if (!aiFeatures.enabled) {
    if (aiFeatures.couldBeEnabled) {
      return <EnableAIFeaturesLink />;
    }
    return null;
  }

  const connectorsResult = aiFeatures.genAiConnectors;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          isDisabled={!connectorsResult?.connectors?.length}
          isLoading={connectorsResult?.loading}
          size={buttonSize}
          fill={fill}
          {...buttonProps}
        />
      </EuiFlexItem>
      {connectorsResult?.connectors && connectorsResult.connectors.length >= 2 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={splitButtonPopoverId}
            isOpen={isPopoverOpen}
            closePopover={() => closePopover()}
            button={
              <EuiButtonIcon
                data-test-subj="streamsAppAiPickConnectorButton"
                onClick={togglePopover}
                display="base"
                size={buttonSize}
                iconType="boxesVertical"
                aria-label={SHOW_MORE_ARIA_LABEL}
              />
            }
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel
              size="s"
              items={connectorsResult.connectors.map((connector) => (
                <EuiContextMenuItem
                  key={connector.id}
                  icon={connector.id === connectorsResult.selectedConnector ? 'check' : 'empty'}
                  onClick={() => {
                    connectorsResult.selectConnector(connector.id);
                    closePopover();
                  }}
                >
                  {connector.name}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export function ConnectorListButton({
  buttonProps,
}: {
  buttonProps: EuiButtonProps & { onClick?: () => void };
}) {
  const aiFeatures = useAIFeatures();

  return <ConnectorListButtonBase buttonProps={buttonProps} aiFeatures={aiFeatures} />;
}
