/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ActionType } from '@kbn/actions-plugin/common';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from '../translations';
import { ActionTypeList } from './action_type_list';

interface ActionTypeSelectorModalProps {
  actionTypes?: ActionType[];
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  onSelect: (actionType: ActionType) => void;
  actionTypeSelectorInline: boolean;
  isMissingConnectorPrivileges?: boolean;
  missingPrivilegesTooltip?: string;
}

export const ActionTypeSelectorModal: React.FC<ActionTypeSelectorModalProps> = React.memo(
  ({
    actionTypes,
    actionTypeRegistry,
    onClose,
    onSelect,
    actionTypeSelectorInline,
    isMissingConnectorPrivileges = false,
    missingPrivilegesTooltip,
  }) => {
    const modalTitleId = useGeneratedHtmlId();

    if (!actionTypes?.length) return null;

    const actionTypeList = (
      <ActionTypeList
        actionTypes={actionTypes}
        actionTypeRegistry={actionTypeRegistry}
        onSelect={onSelect}
        isMissingConnectorPrivileges={isMissingConnectorPrivileges}
        missingPrivilegesTooltip={missingPrivilegesTooltip}
      />
    );

    if (actionTypeSelectorInline) return actionTypeList;

    return (
      <EuiModal
        onClose={onClose}
        data-test-subj="action-type-selector-modal"
        aria-labelledby={modalTitleId}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.INLINE_CONNECTOR_PLACEHOLDER}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{actionTypeList}</EuiModalBody>
      </EuiModal>
    );
  }
);

ActionTypeSelectorModal.displayName = 'ActionTypeSelectorModal';
