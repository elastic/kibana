/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { PendingConnectorChange } from './use_apply_template_connector_guard';
import * as i18n from '../../common/translations';

interface TemplateConnectorChangeModalProps {
  pendingChange: PendingConnectorChange;
  /** Apply the template's connector (system B), or remove the connector. */
  onConfirm: () => void;
  /** Apply the template but keep the case's current connector (system A). */
  onCancel: () => void;
  isApplying: boolean;
}

/**
 * Warns that changing/removing the connector of an already-pushed case can orphan its external
 * ticket, and lets the user confirm the change or keep the current connector. Naming the specific
 * systems follows the Cases destructive-action protocol (confirm with specificity).
 */
export const TemplateConnectorChangeModal: FC<TemplateConnectorChangeModalProps> = ({
  pendingChange,
  onConfirm,
  onCancel,
  isApplying,
}) => {
  const titleId = useGeneratedHtmlId();
  const { currentConnectorName, nextConnectorName } = pendingChange;

  const isRemoval = nextConnectorName === null;
  const title = isRemoval ? i18n.REMOVE_CONNECTOR_MODAL_TITLE : i18n.CHANGE_CONNECTOR_MODAL_TITLE;
  const body = isRemoval
    ? i18n.REMOVE_CONNECTOR_MODAL_BODY(currentConnectorName)
    : i18n.CHANGE_CONNECTOR_MODAL_BODY(currentConnectorName, nextConnectorName);
  const confirmButtonText = isRemoval
    ? i18n.REMOVE_CONNECTOR_MODAL_CONFIRM(currentConnectorName)
    : i18n.CHANGE_CONNECTOR_MODAL_CONFIRM(nextConnectorName);

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.CHANGE_CONNECTOR_MODAL_KEEP(currentConnectorName)}
      confirmButtonText={confirmButtonText}
      buttonColor="warning"
      isLoading={isApplying}
      defaultFocusedButton="cancel"
      data-test-subj="template-connector-change-modal"
    >
      {body}
    </EuiConfirmModal>
  );
};

TemplateConnectorChangeModal.displayName = 'TemplateConnectorChangeModal';
