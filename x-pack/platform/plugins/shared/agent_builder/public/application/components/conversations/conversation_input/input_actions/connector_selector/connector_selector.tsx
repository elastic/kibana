/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
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
import { i18n } from '@kbn/i18n';
import { useSendMessage } from '../../../../../context/send_message/send_message_context';
import { useDefaultConnector } from '../../../../../hooks/chat/use_default_connector';
import { useKibana } from '../../../../../hooks/use_kibana';
import { getMaxListHeight, useSelectorListStyles } from '../input_actions.styles';
import { InputPopoverButton } from '../input_popover_button';
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
  searchValue: string;
}> = ({ connectorId, connectorName, searchValue }) => {
  const { euiTheme } = useEuiTheme();
  if (!connectorId) {
    return null;
  }

  const fontWeightStyles = css`
    h4 {
      font-weight: ${euiTheme.font.weight.regular};
    }
    .euiSelectableListItem-isFocused & h4 {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
  `;
  return (
    <EuiText size="s" css={fontWeightStyles}>
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
        prepend: <ConnectorIcon connectorName={connector.name} />,
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
  const listItemsHeight = connectorOptions.length * CONNECTOR_OPTION_ROW_HEIGHT;
  // Calculate height based on item count, capped at max rows
  const listHeight = Math.min(listItemsHeight, getMaxListHeight({ withHeader: false }));

  return (
    <EuiPopover
      panelProps={{ css: panelStyles }}
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
        height={listHeight}
        listProps={{
          id: connectorListId,
          css: selectorListStyles,
          rowHeight: CONNECTOR_OPTION_ROW_HEIGHT,
          onFocusBadge: false,
        }}
      >
        {(list) => <div>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};
