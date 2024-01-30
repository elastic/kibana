/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionType } from '@kbn/actions-plugin/common';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import {
  ActionConnector,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ActionTypeSelectorModal } from '../connector_selector_inline/action_type_selector_modal';
interface Props {
  actionTypeRegistry: ActionTypeRegistryContract;
  actionTypes?: ActionType[];
  onClose: () => void;
  onSaveConnector: (connector: ActionConnector) => void;
  onSelectActionType: (actionType: ActionType) => void;
  selectedActionType: ActionType | null;
}
export const AddConnectorModal: React.FC<Props> = React.memo(
  ({
    actionTypeRegistry,
    actionTypes,
    onClose,
    onSaveConnector,
    onSelectActionType,
    selectedActionType,
  }) =>
    !selectedActionType ? (
      <ActionTypeSelectorModal
        actionTypes={actionTypes}
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onSelect={onSelectActionType}
      />
    ) : (
      <ConnectorAddModal
        actionType={selectedActionType}
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        postSaveEventHandler={onSaveConnector}
      />
    )
);

AddConnectorModal.displayName = 'AddConnectorModal';
