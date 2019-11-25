/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiFlexGrid,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionType } from '../../../types';
import { ActionsContext } from '../../context/actions_context';
import { useAppDependencies } from '../..';

interface Props {
  setActionType: React.Dispatch<React.SetStateAction<ActionType | undefined>>;
}

export const ActionTypeMenu = ({ setActionType }: Props) => {
  const { actionTypeRegistry } = useAppDependencies();
  const { actionTypesIndex, setFlyoutVisibility } = useContext(ActionsContext);
  if (!actionTypesIndex) {
    return null;
  }
  const actionTypes = Object.entries(actionTypesIndex)
    .filter(([index]) => actionTypeRegistry.has(index))
    .map(([index, actionType]) => {
      const actionTypeModel = actionTypeRegistry.get(index);
      return {
        iconClass: actionTypeModel ? actionTypeModel.iconClass : '',
        selectMessage: actionTypeModel ? actionTypeModel.selectMessage : '',
        actionType,
        name: actionType.name,
        typeName: index.replace('.', ''),
      };
    });

  const cardNodes = actionTypes.map(function(item, index): any {
    return (
      <EuiFlexItem key={index}>
        <EuiCard
          icon={<EuiIcon size="xl" type={item.iconClass} />}
          title={item.name}
          description={item.selectMessage}
          onClick={() => setActionType(item.actionType)}
        />
      </EuiFlexItem>
    );
  });

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiFlexGrid columns={2}>{cardNodes}</EuiFlexGrid>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setFlyoutVisibility(false)}>
              {i18n.translate('xpack.triggersActionsUI.sections.actionAdd.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
