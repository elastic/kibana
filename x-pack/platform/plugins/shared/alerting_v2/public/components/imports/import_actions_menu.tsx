/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDeleteImport } from '../../hooks/use_delete_import';

const MORE_ACTIONS_LABEL = i18n.translate('xpack.alertingV2.imports.list.action.moreActions', {
  defaultMessage: 'More actions',
});

interface ImportActionsMenuProps {
  importId: string;
  importName: string;
}

/** The row actions of an import: for now only Delete, which asks for confirmation first. */
export const ImportActionsMenu = ({ importId, importName }: ImportActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const { mutate: deleteImport, isLoading: isDeleting } = useDeleteImport();
  const confirmTitleId = useGeneratedHtmlId();

  const onConfirmDelete = () =>
    deleteImport(importId, { onSettled: () => setIsConfirmOpen(false) });

  return (
    <>
      <EuiPopover
        button={
          <EuiToolTip content={MORE_ACTIONS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="ellipsis"
              aria-label={MORE_ACTIONS_LABEL}
              color="text"
              onClick={() => setIsOpen((open) => !open)}
              data-test-subj={`importActionsButton-${importId}`}
            />
          </EuiToolTip>
        }
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        aria-label={i18n.translate('xpack.alertingV2.imports.list.action.menuAriaLabel', {
          defaultMessage: 'Import actions',
        })}
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={[
            {
              id: 0,
              items: [
                {
                  name: i18n.translate('xpack.alertingV2.imports.list.action.delete', {
                    defaultMessage: 'Delete',
                  }),
                  icon: 'trash',
                  onClick: () => {
                    closePopover();
                    setIsConfirmOpen(true);
                  },
                  'data-test-subj': 'importsDeleteAction',
                },
              ],
            },
          ]}
        />
      </EuiPopover>
      {isConfirmOpen && (
        <EuiConfirmModal
          aria-labelledby={confirmTitleId}
          titleProps={{ id: confirmTitleId }}
          title={i18n.translate('xpack.alertingV2.imports.deleteModal.title', {
            defaultMessage: 'Delete import',
          })}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={onConfirmDelete}
          cancelButtonText={i18n.translate('xpack.alertingV2.imports.deleteModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.alertingV2.imports.deleteModal.confirmButton', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          isLoading={isDeleting}
          data-test-subj="importsDeleteConfirmModal"
        >
          <FormattedMessage
            id="xpack.alertingV2.imports.deleteModal.body"
            defaultMessage="Delete {importName}? The associated connector is deleted too, and it stops receiving alerts. This action cannot be undone."
            values={{ importName: <strong>{importName}</strong> }}
          />
        </EuiConfirmModal>
      )}
    </>
  );
};
