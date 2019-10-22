/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useContext } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
  EuiButton,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionsContext } from '../../../context/actions_context';
import { ActionType } from '../../../../types';

interface Props {
  actionTypesIndex: Record<string, ActionType> | undefined;
  createAction: (actionTypeItem: ActionType) => void;
}

export const AlertingActionsDropdown: React.FunctionComponent<Props> = ({
  actionTypesIndex,
  createAction,
}) => {
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);
  const { actionTypeRegistry } = useContext(ActionsContext);
  if (!actionTypesIndex) {
    return null;
  }
  const actions = Object.entries(actionTypesIndex)
    .filter(([index]) => actionTypeRegistry.has(index))
    .map(([index, actionType]) => {
      return {
        ...actionTypeRegistry.get(actionType.id),
        name: actionType.name,
        typeName: index.replace('.', ''),
      };
    });

  const button = (
    <EuiButton
      data-test-subj="addAlertingActionButton"
      fill
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsPopOverOpen(!isPopoverOpen)}
    >
      <FormattedMessage
        id="xpack.alertingUI.sections.actionsList.addActionButtonLabel"
        defaultMessage="Add action"
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id="alertingActionPanel"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopOverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={actions.map((action, index) => {
          const isActionDisabled = false;
          const description = action.selectMessage;
          return (
            <EuiContextMenuItem
              key={`${action.typeName}-${index}`}
              disabled={isActionDisabled}
              data-test-subj={`${action.typeName}ActionButton`}
              onClick={() => {
                setIsPopOverOpen(false);
                createAction(action);
              }}
            >
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type={action.iconClass} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <strong>{action.name}</strong>
                  <EuiSpacer size="xs" />
                  <EuiText size="s">
                    <p>{description}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );
};
