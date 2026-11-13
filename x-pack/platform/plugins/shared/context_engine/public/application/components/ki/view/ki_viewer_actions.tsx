/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

interface KiViewerActionsProps {
  isDeleted: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  isDeleting: boolean;
  isRestoring: boolean;
}

/**
 * Edit and Delete under the document (prototype). A deleted document gets Restore instead of
 * Delete, and Edit is disabled because the API refuses edits until the document is restored.
 */
export const KiViewerActions = ({
  isDeleted,
  onEdit,
  onDelete,
  onRestore,
  isDeleting,
  isRestoring,
}: KiViewerActionsProps) => (
  <EuiFlexGroup gutterSize="m" responsive={false} wrap data-test-subj="contextKiViewerActions">
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={
          isDeleted
            ? i18n.translate('xpack.contextEngine.viewKi.editDeletedTooltip', {
                defaultMessage: 'Restore this Knowledge document to edit it.',
              })
            : undefined
        }
      >
        <EuiButton
          iconType="pencil"
          onClick={onEdit}
          isDisabled={isDeleted}
          data-test-subj="contextViewKiEditButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
            action: CONTEXT_ENGINE_UI_EBT.action.editKi.EDIT,
          })}
        >
          <FormattedMessage id="xpack.contextEngine.viewKi.editButton" defaultMessage="Edit" />
        </EuiButton>
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {isDeleted ? (
        <EuiButton
          iconType="refresh"
          onClick={onRestore}
          isLoading={isRestoring}
          data-test-subj="contextViewKiRestoreButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
            action: CONTEXT_ENGINE_UI_EBT.action.viewKi.RESTORE,
          })}
        >
          <FormattedMessage
            id="xpack.contextEngine.viewKi.restoreButton"
            defaultMessage="Restore"
          />
        </EuiButton>
      ) : (
        <EuiButton
          iconType="trash"
          onClick={onDelete}
          isLoading={isDeleting}
          data-test-subj="contextViewKiDeleteButton"
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
            action: CONTEXT_ENGINE_UI_EBT.action.viewKi.DELETE,
          })}
        >
          <FormattedMessage id="xpack.contextEngine.viewKi.deleteButton" defaultMessage="Delete" />
        </EuiButton>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
