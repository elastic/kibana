/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiKeyPadMenuItem, EuiToolTip } from '@elastic/eui';
import type { ActionType } from '@kbn/actions-plugin/common';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { css } from '@emotion/css';
import * as i18n from '../translations';

const itemClassName = css`
  inline-size: 150px;

  .euiKeyPadMenuItem__label {
    white-space: nowrap;
    overflow: hidden;
  }
`;

export interface ActionTypeListProps {
  actionTypes: ActionType[];
  actionTypeRegistry: ActionTypeRegistryContract;
  onSelect: (actionType: ActionType) => void;
  isMissingConnectorPrivileges?: boolean;
  missingPrivilegesTooltip?: string;
}

export const ActionTypeList: React.FC<ActionTypeListProps> = ({
  actionTypes,
  actionTypeRegistry,
  onSelect,
  isMissingConnectorPrivileges = false,
  missingPrivilegesTooltip = i18n.ADD_CONNECTOR_MISSING_PRIVILEGES_DESCRIPTION,
}) => (
  <EuiFlexGroup
    justifyContent="center"
    responsive={false}
    wrap={true}
    data-test-subj="action-type-list"
  >
    {actionTypes.map((actionType: ActionType) => {
      const fullAction = actionTypeRegistry.get(actionType.id);
      const buttonIsDisabled = isMissingConnectorPrivileges || !actionType.enabled;
      const button = (
        <EuiKeyPadMenuItem
          className={itemClassName}
          key={actionType.id}
          isDisabled={buttonIsDisabled}
          label={actionType.name}
          data-test-subj={`action-option-${actionType.name}`}
          onClick={() => onSelect(actionType)}
        >
          <EuiIcon size="xl" type={fullAction.iconClass} />
        </EuiKeyPadMenuItem>
      );
      return (
        <EuiFlexItem data-test-subj="action-option" key={actionType.id} grow={false}>
          {isMissingConnectorPrivileges && missingPrivilegesTooltip ? (
            <EuiToolTip content={missingPrivilegesTooltip}>{button}</EuiToolTip>
          ) : (
            button
          )}
        </EuiFlexItem>
      );
    })}
  </EuiFlexGroup>
);
