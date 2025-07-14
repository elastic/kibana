/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiKeyPadMenuItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
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
  actionTypeSelectorInline: boolean;
}
const itemClassName = css`
  inline-size: 150px;

  .euiKeyPadMenuItem__label {
    white-space: nowrap;
    overflow: hidden;
  }
`;

export const ActionTypeSelectorModal = React.memo(
  ({ actionTypes, actionTypeRegistry, onClose, onSelect, actionTypeSelectorInline }: Props) => {
    const modalTitleId = useGeneratedHtmlId();

    const content = useMemo(
      () => (
        <EuiFlexGroup justifyContent="center" responsive={false} wrap={true}>
          {actionTypes?.map((actionType: ActionType) => {
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
      ),
      [actionTypeRegistry, actionTypes, onSelect]
    );

    if (!actionTypes?.length) return null;

    if (actionTypeSelectorInline) return <>{content}</>;

    return (
      <EuiModal onClose={onClose} data-test-subj="action-type-selector-modal" aria-labelledby={modalTitleId}>
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>{i18n.INLINE_CONNECTOR_PLACEHOLDER}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{content}</EuiModalBody>
      </EuiModal>
    );
  }
);

ActionTypeSelectorModal.displayName = 'ActionTypeSelectorModal';