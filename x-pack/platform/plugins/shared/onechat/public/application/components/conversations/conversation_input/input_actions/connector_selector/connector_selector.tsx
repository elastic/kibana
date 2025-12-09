/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexItem,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react-markdown';
import { i18n } from '@kbn/i18n';
import { useSendMessage } from '../../../../../context/send_message/send_message_context';
import { useDefaultConnector } from '../../../../../hooks/chat/use_default_connector';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useSelectorListStyles } from '../input_actions.styles';
import { InputPopoverButton } from '../input_popover_button';
import { SelectorListHeader } from '../selector_list_header';

const selectableAriaLabel = i18n.translate(
  'xpack.onechat.conversationInput.connectorSelector.selectableAriaLabel',
  {
    defaultMessage: 'Select a connector',
  }
);
const manageConnectorsAriaLabel = i18n.translate(
  'xpack.onechat.conversationInput.connectorSelector.manageConnectorAriaLabel',
  {
    defaultMessage: 'Manage connectors',
  }
);
const defaultConnectorLabel = i18n.translate(
  'xpack.onechat.conversationInput.connectorSelector.defaultConnectorLabel',
  {
    defaultMessage: 'Default',
  }
);
const connectorSearchPlaceholder = i18n.translate(
  'xpack.onechat.conversationInput.connectorSelector.search.placeholder',
  { defaultMessage: 'Search LLMs' }
);

const connectorSelectId = 'agentBuilderConnectorSelect';
const connectorListId = `${connectorSelectId}_listbox`;

const ConnectorPopoverButton: React.FC<{
  isPopoverOpen: boolean;
  onClick: () => void;
  disabled: boolean;
}> = ({ isPopoverOpen, onClick, disabled }) => {
  return (
    <InputPopoverButton
      open={isPopoverOpen}
      disabled={disabled}
      iconType="compute"
      onClick={onClick}
      aria-labelledby={connectorSelectId}
      data-test-subj="agentBuilderConnectorSelectorButton"
    >
      <FormattedMessage
        id="xpack.onechat.conversationInput.connectorSelector.buttonLabel"
        defaultMessage="LLM"
      />
    </InputPopoverButton>
  );
};

const ConnectorListHeader: React.FC<{ search: ReactNode }> = ({ search }) => {
  const { navigateToManageConnectors } = useNavigation();
  return (
    <SelectorListHeader>
      <EuiFlexItem grow={true}>{search}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="m"
          iconType="gear"
          color="text"
          aria-label={manageConnectorsAriaLabel}
          onClick={navigateToManageConnectors}
        />
      </EuiFlexItem>
    </SelectorListHeader>
  );
};

const ConnectorOption: React.FC<{
  connectorId?: string;
  connectorName: string;
  searchValue: string;
}> = ({ connectorId, connectorName, searchValue }) => {
  if (!connectorId) {
    return null;
  }
  return (
    <EuiText size="s">
      <h4>
        <EuiHighlight search={searchValue}>{connectorName}</EuiHighlight>
      </h4>
    </EuiText>
  );
};

const DefaultConnectorBadge = () => {
  return (
    <EuiBadge color="hollow" data-test-subj="defaultConnectorBadge">
      {defaultConnectorLabel}
    </EuiBadge>
  );
};

type ConnectorOptionData = EuiSelectableOption<{}>;

export const ConnectorSelector: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
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

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const panelStyles = css`
    inline-size: calc(${euiTheme.size.xxl} * 8);
  `;

  const connectorOptions = useMemo(() => {
    const options = connectors.map((connector) => {
      let checked: 'on' | undefined;
      if (connector.id === selectedConnectorId) {
        checked = 'on';
      }
      const option: ConnectorOptionData = {
        key: connector.id,
        label: connector.name,
        checked,
        append: connector.id === defaultConnectorId ? <DefaultConnectorBadge /> : undefined,
      };
      return option;
    });
    return options;
  }, [connectors, selectedConnectorId, defaultConnectorId]);

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

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
      button={
        <ConnectorPopoverButton
          isPopoverOpen={isPopoverOpen}
          onClick={togglePopover}
          disabled={isLoading || connectors.length === 0}
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
        searchable
        searchProps={{ placeholder: connectorSearchPlaceholder }}
        options={connectorOptions}
        onChange={(_options, _event, changedOption) => {
          const { checked, key: connectorId } = changedOption;
          const isChecked = checked === 'on';
          if (isChecked && connectorId) {
            onSelectConnector(connectorId);
            closePopover();
          }
        }}
        renderOption={(option, searchValue) => {
          const { key: connectorId, label: connectorName } = option;
          return (
            <ConnectorOption
              key={connectorId}
              connectorId={connectorId}
              connectorName={connectorName}
              searchValue={searchValue}
            />
          );
        }}
        listProps={{ id: connectorListId, css: selectorListStyles }}
      >
        {(list, search) => (
          <div>
            <ConnectorListHeader search={search} />
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
