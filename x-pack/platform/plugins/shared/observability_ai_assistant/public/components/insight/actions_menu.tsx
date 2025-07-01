/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiContextMenu, EuiPanel, EuiPopover, EuiButtonEmpty } from '@elastic/eui';
import { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import { ConnectorSelectorBase } from '../connector_selector/connector_selector_base';
import { useKibana } from '../../hooks/use_kibana';
import { navigateToConnectorsManagementApp } from '../../utils/navigate_to_connectors';

export function ActionsMenu({
  connectors,
  onEditPrompt,
}: {
  connectors: UseGenAIConnectorsResult;
  onEditPrompt: () => void;
}) {
  const { application } = useKibana().services;
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const panels = [
    {
      id: 0,
      title: 'Actions',
      items: [
        {
          name: (
            <div className="eui-textTruncate">
              {i18n.translate('xpack.observabilityAiAssistant.insight.actions.connector', {
                defaultMessage: 'Connector',
              })}{' '}
              <strong>
                {connectors.connectors?.find(({ id }) => id === connectors.selectedConnector)?.name}
              </strong>
            </div>
          ),
          icon: 'wrench',
          panel: 1,
        },
        {
          name: i18n.translate('xpack.observabilityAiAssistant.insight.actions.editPrompt', {
            defaultMessage: 'Edit prompt',
          }),
          icon: 'documentEdit',
          onClick: () => {
            onEditPrompt();
            closePopover();
          },
        },
      ],
    },
    {
      id: 1,
      title: i18n.translate('xpack.observabilityAiAssistant.insight.actions.connector', {
        defaultMessage: 'Connector',
      }),
      content: (
        <EuiPanel>
          <ConnectorSelectorBase {...connectors} />
          <EuiButtonEmpty
            flush="left"
            size="xs"
            onClick={() => navigateToConnectorsManagementApp(application!)}
          >
            {i18n.translate(
              'xpack.observabilityAiAssistant.insight.actions.connector.manageConnectors',
              {
                defaultMessage: 'Manage connectors',
              }
            )}
          </EuiButtonEmpty>
        </EuiPanel>
      ),
    },
  ];

  const button = (
    <EuiButtonIcon
      aria-label={i18n.translate('xpack.observabilityAiAssistant.insight.openActions', {
        defaultMessage: 'Open insight actions',
      })}
      data-test-subj="observabilityAiAssistantInsightActionsButtonIcon"
      iconType="boxesHorizontal"
      onClick={onButtonClick}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
}
