/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { InferenceConnector } from '@kbn/inference-common';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback, useMemo, useState } from 'react';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import { useModelSettingsUrl } from '../../../../../hooks/use_model_settings_url';
import { buildConnectorSelectionPanel } from './context_menu_helpers';
import {
  MODEL_SELECTION_BUTTON_ARIA_LABEL,
  MODEL_SELECTION_BUTTON_LABEL,
  MODEL_SETTINGS_LABEL,
} from './translations';

export interface ModelSlot {
  id: string;
  label: string;
  resolvedConnectorId: string | undefined;
  selectedConnectorId: string | undefined;
  onSelect: (connectorId: string) => void;
}

interface ModelSelectorButtonProps {
  allConnectors: InferenceConnector[];
  slots: ModelSlot[];
  error?: Error;
  errorTitle?: string;
  'data-test-subj'?: string;
}

export const ModelSelectorButton = ({
  allConnectors,
  slots,
  error,
  errorTitle,
  'data-test-subj': dataTestSubj,
}: ModelSelectorButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const [menuResetKey, setMenuResetKey] = useState(0);
  const popoverId = useGeneratedHtmlId({ prefix: 'modelSelectorButton' });
  const managementUrl = useModelSettingsUrl();

  const resetMenu = useCallback(() => setMenuResetKey((k) => k + 1), []);

  const closeMenu = useCallback(() => {
    close();
    resetMenu();
  }, [close, resetMenu]);

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const slotItems = slots.map((slot, index) => {
      const connector = allConnectors.find((c) => c.connectorId === slot.selectedConnectorId);
      return {
        name: (
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {slot.label}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ConnectorIcon connectorName={connector?.name} />
                </EuiFlexItem>
                <EuiFlexItem className="eui-textTruncate" css={{ minWidth: 0 }}>
                  {connector?.name ?? '—'}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        panel: index + 1,
        'data-test-subj': `significant_events_model_slot_${slot.id}`,
      };
    });

    const settingsItems = managementUrl
      ? [
          { isSeparator: true as const },
          {
            name: MODEL_SETTINGS_LABEL,
            icon: 'gear' as const,
            href: managementUrl,
            target: '_blank',
            onClick: closeMenu,
          },
        ]
      : [];

    const subPanels = slots.map((slot, index) => ({
      id: index + 1,
      ...buildConnectorSelectionPanel({
        connectors: allConnectors,
        resolvedConnectorId: slot.resolvedConnectorId,
        selectedConnectorId: slot.selectedConnectorId,
        onSelect: (connectorId) => {
          slot.onSelect(connectorId);
          resetMenu();
        },
      }),
    }));

    return [{ id: 0, items: [...slotItems, ...settingsItems] }, ...subPanels];
  }, [slots, allConnectors, managementUrl, closeMenu, resetMenu]);

  const button = (
    <EuiButton
      iconType="arrowDown"
      iconSide="right"
      color="text"
      onClick={toggle}
      aria-label={MODEL_SELECTION_BUTTON_ARIA_LABEL}
      data-test-subj="significant_events_model_selector_trigger"
    >
      {MODEL_SELECTION_BUTTON_LABEL}
    </EuiButton>
  );

  const content = error ? (
    <EuiCallOut
      announceOnMount
      color="danger"
      size="s"
      title={errorTitle}
      css={{ margin: euiTheme.size.s }}
    />
  ) : (
    <EuiContextMenu key={menuResetKey} initialPanelId={0} panels={panels} />
  );

  return (
    <EuiPopover
      id={popoverId}
      button={button}
      isOpen={isOpen}
      closePopover={closeMenu}
      anchorPosition="downRight"
      panelPaddingSize="none"
      data-test-subj={dataTestSubj}
    >
      {content}
    </EuiPopover>
  );
};
