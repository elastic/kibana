/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiKeyPadMenuItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { ActionType } from '@kbn/actions-plugin/common';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { css } from '@emotion/css';
import * as i18n from '../translations';

interface Props {
  actionTypes?: ActionType[];
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  onSelect: (actionType: ActionType) => void;
}
const itemClassName = css`
  .euiKeyPadMenuItem__label {
    white-space: nowrap;
    overflow: hidden;
  }
`;

export const ActionTypeSelectorModal = ({
  actionTypes,
  actionTypeRegistry,
  onClose,
  onSelect,
}: Props) =>
  actionTypes && actionTypes.length > 0 ? (
    <EuiModal onClose={onClose} data-test-subj="action-type-selector-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.INLINE_CONNECTOR_PLACEHOLDER}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup>
          {actionTypes.map((actionType: ActionType) => {
            const fullAction = actionTypeRegistry.get(actionType.id);
            return (
              <EuiFlexItem data-test-subj="action-option" key={actionType.id} grow={false}>
                <EuiKeyPadMenuItem
                  className={itemClassName}
                  key={actionType.id}
                  isDisabled={!actionType.enabled}
                  label={actionType.name}
                  data-test-subj={`action-option-${actionType.name}`}
                  onClick={() => onSelect(actionType)}
                >
                  <EuiIcon size="xl" type={fullAction.iconClass} />
                </EuiKeyPadMenuItem>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiModal>
  ) : null;
