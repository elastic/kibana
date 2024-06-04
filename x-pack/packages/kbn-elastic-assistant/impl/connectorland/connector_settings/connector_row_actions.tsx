/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { ActionConnectorTableItem } from './types';

import { DELETE_CONNECTOR_BUTTON, EDIT_CONNECTOR_BUTTON } from '../translations';

interface Props {
  connector: ActionConnectorTableItem;
  onClickEditConnector: (connector: ActionConnectorTableItem) => void;
  onClickDeleteConnector: (connector: ActionConnectorTableItem) => void;
}

const ConnectorRowActionsComponent: React.FC<Props> = ({
  connector,
  onClickEditConnector,
  onClickDeleteConnector,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const handleEditConnector = useCallback(() => {
    closePopover();
    onClickEditConnector(connector);
  }, [closePopover, onClickEditConnector, connector]);

  const handleDeleteConnector = useCallback(() => {
    closePopover();
    onClickDeleteConnector(connector);
  }, [closePopover, onClickDeleteConnector, connector]);

  const onButtonClick = useCallback(() => setIsPopoverOpen((prevState) => !prevState), []);
  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="success"
          iconType="boxesHorizontal"
          disabled={connector == null}
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
    >
      <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="pencil" onClick={handleEditConnector}>
            {EDIT_CONNECTOR_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty iconType="trash" onClick={handleDeleteConnector}>
            {DELETE_CONNECTOR_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

export const ConnectorRowActions = React.memo(ConnectorRowActionsComponent);
ConnectorRowActions.displayName = 'ConnectorRowActions';
