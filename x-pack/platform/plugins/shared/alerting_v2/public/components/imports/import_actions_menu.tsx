/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_EPISODES_STATUS_ALL } from '@kbn/alerting-v2-constants';
import { useAlertingLocators } from '../../application/locator_context';

interface ImportActionsMenuProps {
  importId: string;
  importName: string;
  enabled: boolean;
  /** A managed import is switched on and off at its connector, not here. */
  isManaged?: boolean;
  canWrite: boolean;
  isDisabled?: boolean;
  onViewDetails: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
}

/** POC: row actions of the imports table. */
export const ImportActionsMenu = ({
  importId,
  importName,
  enabled,
  isManaged = false,
  canWrite,
  isDisabled = false,
  onViewDetails,
  onToggleEnabled,
  onDelete,
}: ImportActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { episodesLocators } = useAlertingLocators();
  const close = () => setIsOpen(false);

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        {
          name: i18n.translate('xpack.alertingV2.imports.action.viewDetails', {
            defaultMessage: 'View details',
          }),
          icon: 'eye',
          onClick: () => {
            close();
            onViewDetails();
          },
          'data-test-subj': 'importsActionViewDetails',
        },
        {
          name: i18n.translate('xpack.alertingV2.imports.action.viewAlerts', {
            defaultMessage: 'View alerts',
          }),
          icon: 'external',
          onClick: () => {
            close();
            episodesLocators.navigateSync({
              filters: { ruleId: importId, status: ALERTING_V2_EPISODES_STATUS_ALL },
            });
          },
          'data-test-subj': 'importsActionViewAlerts',
        },
        ...(canWrite && !isManaged
          ? [
              {
                name: enabled
                  ? i18n.translate('xpack.alertingV2.imports.action.disable', {
                      defaultMessage: 'Disable',
                    })
                  : i18n.translate('xpack.alertingV2.imports.action.enable', {
                      defaultMessage: 'Enable',
                    }),
                icon: enabled ? 'pause' : 'play',
                onClick: () => {
                  close();
                  onToggleEnabled();
                },
                'data-test-subj': 'importsActionToggleEnabled',
              },
            ]
          : []),
        ...(canWrite
          ? [
              {
                name: i18n.translate('xpack.alertingV2.imports.action.delete', {
                  defaultMessage: 'Delete',
                }),
                icon: 'trash',
                onClick: () => {
                  close();
                  onDelete();
                },
                'data-test-subj': 'importsActionDelete',
              },
            ]
          : []),
      ],
    },
  ];

  const ariaLabel = i18n.translate('xpack.alertingV2.imports.action.moreAriaLabel', {
    defaultMessage: 'Actions for {name}',
    values: { name: importName },
  });

  return (
    <EuiPopover
      aria-label={ariaLabel}
      isOpen={isOpen}
      closePopover={close}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiToolTip
          content={i18n.translate('xpack.alertingV2.imports.action.more', {
            defaultMessage: 'More actions',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="ellipsis"
            color="text"
            aria-label={ariaLabel}
            isDisabled={isDisabled}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`importsActionsButton-${importId}`}
          />
        </EuiToolTip>
      }
    >
      <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="importsActionsMenu" />
    </EuiPopover>
  );
};
