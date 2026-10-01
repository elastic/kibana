/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import { mainTranslations } from './main_i18n';

const translations = mainTranslations.columns.dataSets;

export interface DatasetRowActionsProps {
  disabled?: boolean;
  onOpenInDiscover?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const DatasetRowActions: FunctionComponent<DatasetRowActionsProps> = ({
  disabled = false,
  onOpenInDiscover,
  onEdit,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {onOpenInDiscover && (
        <EuiToolTip content={translations.discoverAction} disableScreenReaderOutput>
          <EuiButtonIcon
            onClick={onOpenInDiscover}
            isDisabled={disabled}
            iconType="productDiscover"
            color="text"
            aria-label={translations.discoverAction}
            data-test-subj="dataSetsSetsDiscoverButton"
          />
        </EuiToolTip>
      )}
      <EuiPopover
        aria-label={translations.moreActions}
        button={
          <EuiToolTip content={translations.moreActions} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="ellipsis"
              color="text"
              isDisabled={disabled}
              aria-label={translations.moreActions}
              onClick={() => setIsMenuOpen((open) => !open)}
              data-test-subj="dataSetsSetsActionsButton"
            />
          </EuiToolTip>
        }
        isOpen={isMenuOpen}
        closePopover={closeMenu}
        panelPaddingSize="none"
        anchorPosition="leftCenter"
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="edit"
              icon="pencil"
              onClick={() => {
                closeMenu();
                onEdit();
              }}
              data-test-subj="dataSetsSetsEditButton"
            >
              {translations.editAction}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              key="delete"
              icon="trash"
              color="danger"
              onClick={() => {
                closeMenu();
                onDelete();
              }}
              data-test-subj="dataSetsSetsDeleteIconButton"
            >
              {translations.deleteAction}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
    </>
  );
};
