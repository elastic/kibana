/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const MORE_ACTIONS_LABEL = i18n.translate('xpack.alertingV2.imports.list.action.moreActions', {
  defaultMessage: 'More actions',
});

interface ImportActionsMenuProps {
  connectorId: string;
  /** Link to the connector in Stack Management. */
  connectorUrl: string;
}

/** The row actions of an import: for now only Manage, which opens its connector. */
export const ImportActionsMenu = ({ connectorId, connectorUrl }: ImportActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);

  return (
    <EuiPopover
      button={
        <EuiToolTip content={MORE_ACTIONS_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            aria-label={MORE_ACTIONS_LABEL}
            color="text"
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`importActionsButton-${connectorId}`}
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
                name: i18n.translate('xpack.alertingV2.imports.list.action.manage', {
                  defaultMessage: 'Manage',
                }),
                icon: 'gear',
                href: connectorUrl,
                target: '_blank',
                onClick: closePopover,
                'data-test-subj': 'importsManageAction',
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};
