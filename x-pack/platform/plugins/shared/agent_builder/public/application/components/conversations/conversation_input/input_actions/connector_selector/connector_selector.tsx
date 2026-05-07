/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
} from '@elastic/eui';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUiPrivileges } from '../../../../../hooks/use_ui_privileges';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useConnectorSelection } from '../../../../../hooks/chat/use_connector_selection';
import { useDefaultConnector } from '../../../../../hooks/chat/use_default_connector';
import { useKibana } from '../../../../../hooks/use_kibana';
import {
  getMaxListHeight,
  selectorPopoverPanelStyles,
  useSelectorListStyles,
} from '../input_actions.styles';
import { InputPopoverButton } from '../input_popover_button';
import { OptionText } from '../option_text';
import { ConnectorIcon } from './connector_icon';

const selectableAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.selectableAriaLabel',
  {
    defaultMessage: 'Select a model',
  }
);

/**
 * Generates an accessible label for the connector selector button that includes
 * both the action ("Select connector") and the current value, satisfying WCAG 4.1.2
 * Name, Role, Value requirement so screen readers announce the selected connector.
 */
const getConnectorButtonAriaLabel = (connectorName: string) =>
  i18n.translate(
    'xpack.agentBuilder.conversationInput.connectorSelector.connectorButtonAriaLabel',
    {
      defaultMessage: 'Select connector, {connectorName}',
      values: { connectorName },
    }
  );

const defaultConnectorLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.defaultConnectorLabel',
  {
    defaultMessage: 'Default',
  }
);

const recommendedSectionLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.recommendedSectionLabel',
  { defaultMessage: 'Recommended' }
);

const otherSectionLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.otherSectionLabel',
  { defaultMessage: 'Other' }
);

const customSectionLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.customSectionLabel',
  { defaultMessage: 'Custom' }
);

const connectorSelectId = 'agentBuilderConnectorSelect';
const connectorListId = `${connectorSelectId}_listbox`;
const CONNECTOR_OPTION_ROW_HEIGHT = 32;

const defaultConnectorButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.buttonLabel',
  { defaultMessage: 'LLM' }
);

const ConnectorPopoverButton: React.FC<{
  isPopoverOpen: boolean;
  onClick: () => void;
  disabled: boolean;
  selectedConnectorName?: string;
}> = ({ isPopoverOpen, onClick, disabled, selectedConnectorName }) => {
  const connectorDisplayName = selectedConnectorName ?? defaultConnectorButtonLabel;
  return (
    <InputPopoverButton
      open={isPopoverOpen}
      disabled={disabled}
      iconType={() => <ConnectorIcon connectorName={selectedConnectorName} />}
      onClick={onClick}
      aria-label={getConnectorButtonAriaLabel(connectorDisplayName)}
      data-test-subj="agentBuilderConnectorSelectorButton"
    >
      {connectorDisplayName}
    </InputPopoverButton>
  );
};

const ConnectorOption: React.FC<{
  connectorId?: string;
  connectorName: string;
}> = ({ connectorId, connectorName }) => {
  if (!connectorId) {
    return null;
  }

  return <OptionText>{connectorName}</OptionText>;
};

const DefaultConnectorBadge = () => {
  return (
    <EuiBadge color="hollow" data-test-subj="defaultConnectorBadge">
      {defaultConnectorLabel}
    </EuiBadge>
  );
};

const manageConnectorsAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.connectorSelector.manageConnectors.ariaLabel',
  {
    defaultMessage: 'Manage models',
  }
);

const ConnectorListFooter: React.FC = () => {
  const { manageConnectorsUrl } = useNavigation();
  const { write: hasWritePrivilege } = useUiPrivileges();
  return (
    <EuiPopoverFooter paddingSize="s">
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiButtonEmpty
            size="s"
            iconType="gear"
            color="text"
            aria-label={manageConnectorsAriaLabel}
            href={manageConnectorsUrl}
            disabled={!hasWritePrivilege}
          >
            <FormattedMessage
              id="xpack.agentBuilder.conversationInput.agentSelector.manageAgents"
              defaultMessage="Manage"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverFooter>
  );
};

type ConnectorOptionData = EuiSelectableOption<{}>;

export const ConnectorSelector: React.FC<{}> = () => {
  const {
    services: { http, settings },
  } = useKibana();
  const {
    selectConnector: onSelectConnector,
    selectedConnector: selectedConnectorId,
    defaultConnectorId,
    defaultConnectorOnly,
  } = useConnectorSelection();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { data: aiConnectors, isLoading } = useLoadConnectors({
    http,
    featureId: 'agent_builder',
    settings,
  });

  const connectors = useMemo(() => aiConnectors ?? [], [aiConnectors]);

  const { recommendedConnectors, otherConnectors, customConnectors } = useMemo(() => {
    const groupedConnectors = connectors.reduce<{
      recommendedConnectors: typeof connectors;
      otherConnectors: typeof connectors;
      customConnectors: typeof connectors;
    }>(
      (acc, c) => {
        if (c.isRecommended) {
          acc.recommendedConnectors.push(c);
        } else if (c.isPreconfigured) {
          acc.otherConnectors.push(c);
        } else {
          acc.customConnectors.push(c);
        }
        return acc;
      },
      { recommendedConnectors: [], otherConnectors: [], customConnectors: [] }
    );
    return groupedConnectors;
  }, [connectors]);

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const connectorOptions = useMemo(() => {
    const toOption = (connector: (typeof connectors)[0]): ConnectorOptionData => ({
      key: connector.id,
      label: connector.name,
      checked: connector.id === selectedConnectorId ? 'on' : undefined,
      prepend: <ConnectorIcon connectorName={connector.name} />,
      append: connector.id === defaultConnectorId ? <DefaultConnectorBadge /> : undefined,
    });
    const groupLabel = (label: string, dataTestSubj: string): ConnectorOptionData =>
      ({
        label,
        isGroupLabel: true as const,
        'data-test-subj': dataTestSubj,
      } as ConnectorOptionData);

    const recommendedOptions = recommendedConnectors.map(toOption);
    const otherOptions = otherConnectors.map(toOption);
    const customOptions = customConnectors.map(toOption);

    const sections: ConnectorOptionData[] = [];
    if (recommendedConnectors.length > 0) {
      sections.push(
        groupLabel(recommendedSectionLabel, 'connectorSelectorSectionHeader-recommended'),
        ...recommendedOptions
      );
    }
    if (otherConnectors.length > 0) {
      sections.push(
        groupLabel(otherSectionLabel, 'connectorSelectorSectionHeader-other'),
        ...otherOptions
      );
    }
    if (customConnectors.length > 0) {
      sections.push(
        groupLabel(customSectionLabel, 'connectorSelectorSectionHeader-custom'),
        ...customOptions
      );
    }
    return sections;
  }, [
    recommendedConnectors,
    otherConnectors,
    customConnectors,
    selectedConnectorId,
    defaultConnectorId,
  ]);

  const initialConnectorId = useDefaultConnector({
    connectors,
    defaultConnectorId,
  });

  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId);

  // Track the previously-observed default so we can detect admin-initiated changes.
  // Seeded with the current value on first render and updated on every effect run
  // (including early returns) so the ref stays aligned with the observable even
  // while connectors are still loading. That way, once we proceed past the early
  // return, `previousDefault` reflects the last observed value — not a mount-time
  // baseline — and the first real emission is not mistaken for a change.
  const previousDefaultRef = useRef(defaultConnectorId);

  useEffect(() => {
    const previousDefault = previousDefaultRef.current;
    previousDefaultRef.current = defaultConnectorId;

    if (isLoading || !initialConnectorId) return;

    // Admin enforces "only allow the default model" — always follow the default.
    if (defaultConnectorOnly && defaultConnectorId) {
      if (selectedConnectorId !== defaultConnectorId) {
        onSelectConnector(defaultConnectorId);
      }
      return;
    }

    // No user preference set yet.
    if (!selectedConnectorId) {
      onSelectConnector(initialConnectorId);
      return;
    }

    // Stored preference is no longer in the list (connector deleted or filtered out).
    if (!selectedConnector) {
      onSelectConnector(initialConnectorId);
      return;
    }

    // Admin-initiated change of the default-model setting to a valid connector.
    if (
      defaultConnectorId &&
      defaultConnectorId !== previousDefault &&
      defaultConnectorId !== selectedConnectorId &&
      connectors.some((c) => c.id === defaultConnectorId)
    ) {
      onSelectConnector(defaultConnectorId);
    }
  }, [
    selectedConnectorId,
    selectedConnector,
    isLoading,
    initialConnectorId,
    defaultConnectorId,
    defaultConnectorOnly,
    connectors,
    onSelectConnector,
  ]);

  const selectorListStyles = useSelectorListStyles({ listId: connectorListId });
  const listItemsHeight = connectorOptions.length * CONNECTOR_OPTION_ROW_HEIGHT;
  // Calculate height based on item count, capped at max rows
  const listHeight = Math.min(listItemsHeight, getMaxListHeight({ withHeader: false }));

  return (
    <EuiPopover
      panelProps={{ css: selectorPopoverPanelStyles }}
      button={
        <ConnectorPopoverButton
          isPopoverOpen={isPopoverOpen}
          onClick={togglePopover}
          disabled={isLoading || connectors.length === 0 || defaultConnectorOnly}
          selectedConnectorName={selectedConnector?.name}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="upCenter"
    >
      <EuiSelectable
        id={connectorSelectId}
        data-test-subj="agentBuilderConnectorSelector"
        aria-label={selectableAriaLabel}
        singleSelection
        options={connectorOptions}
        onChange={(_options, _event, changedOption) => {
          const { checked, key: connectorId } = changedOption;
          if (checked === 'on' && connectorId) {
            onSelectConnector(connectorId);
            closePopover();
          }
        }}
        renderOption={(option) => {
          if (option.isGroupLabel) {
            return <OptionText key={option.label}>{option.label}</OptionText>;
          }
          const { key: connectorId, label: connectorName } = option;
          return (
            <ConnectorOption
              key={connectorId}
              connectorId={connectorId}
              connectorName={connectorName}
            />
          );
        }}
        height={listHeight}
        listProps={{
          id: connectorListId,
          css: selectorListStyles,
          rowHeight: CONNECTOR_OPTION_ROW_HEIGHT,
          onFocusBadge: false,
        }}
      >
        {(list) => (
          <div>
            {list}
            <ConnectorListFooter />
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
