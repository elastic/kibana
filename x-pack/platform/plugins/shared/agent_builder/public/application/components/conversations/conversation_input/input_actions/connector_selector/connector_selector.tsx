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
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useUiPrivileges } from '../../../../../hooks/use_ui_privileges';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useSendMessage } from '../../../../../context/send_message/send_message_context';
import { useDefaultConnector } from '../../../../../hooks/chat/use_default_connector';
import { useKibana } from '../../../../../hooks/use_kibana';
import { isRecommendedConnector } from '../../../../../../../common/recommended_connectors';
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
    defaultMessage: 'Select a connector',
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

const ConnectorPopoverButton: React.FC<{
  isPopoverOpen: boolean;
  onClick: () => void;
  disabled: boolean;
  selectedConnectorName?: string;
}> = ({ isPopoverOpen, onClick, disabled, selectedConnectorName }) => {
  return (
    <InputPopoverButton
      open={isPopoverOpen}
      disabled={disabled}
      iconType={() => <ConnectorIcon connectorName={selectedConnectorName} />}
      onClick={onClick}
      aria-labelledby={connectorSelectId}
      data-test-subj="agentBuilderConnectorSelectorButton"
    >
      {selectedConnectorName ?? (
        <FormattedMessage
          id="xpack.agentBuilder.conversationInput.connectorSelector.buttonLabel"
          defaultMessage="LLM"
        />
      )}
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
    defaultMessage: 'Manage connectors',
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
    connectorSelection: {
      selectConnector: onSelectConnector,
      selectedConnector: selectedConnectorId,
      defaultConnectorId,
    },
  } = useSendMessage();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { data: aiConnectors, isLoading } = useLoadConnectors({
    http,
    settings,
    inferenceEnabled: true,
  });

  const connectors = useMemo(() => aiConnectors ?? [], [aiConnectors]);

  const { recommendedConnectors, otherConnectors, customConnectors } = useMemo(() => {
    const recommended = connectors.filter((c) => isRecommendedConnector(c.id));
    const notRecommended = connectors.filter((c) => !isRecommendedConnector(c.id));
    return {
      recommendedConnectors: recommended,
      otherConnectors: notRecommended.filter((c) => c.isPreconfigured),
      customConnectors: notRecommended.filter((c) => !c.isPreconfigured),
    };
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

  useEffect(() => {
    if (!isLoading && initialConnectorId) {
      // No user preference set
      if (!selectedConnectorId) {
        onSelectConnector(initialConnectorId);
      }
      // User preference is set but connector is not available in the list.
      // Scenario: the connector was deleted or admin changed GenAI settings
      else if (selectedConnectorId && !selectedConnector) {
        onSelectConnector(initialConnectorId);
      }
    }
  }, [selectedConnectorId, selectedConnector, isLoading, initialConnectorId, onSelectConnector]);

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
          disabled={isLoading || connectors.length === 0}
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
