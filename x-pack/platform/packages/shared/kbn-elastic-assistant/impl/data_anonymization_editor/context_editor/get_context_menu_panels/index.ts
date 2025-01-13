/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import * as i18n from '../translations';
import { BatchUpdateListItem, ContextEditorRow } from '../types';

export const PRIMARY_PANEL_ID = 'primary-panel-id';

export const getContextMenuPanels = ({
  disableAllow,
  disableAnonymize,
  disableDeny,
  disableUnanonymize,
  closePopover,
  onListUpdated,
  selected,
}: {
  disableAllow: boolean;
  disableAnonymize: boolean;
  disableDeny: boolean;
  disableUnanonymize: boolean;
  closePopover: () => void;
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  selected: ContextEditorRow[];
}): EuiContextMenuPanelDescriptor[] => {
  const nonDefaultsPanelId = PRIMARY_PANEL_ID;

  const nonDefaultsPanelItems: EuiContextMenuPanelDescriptor[] = [
    {
      id: nonDefaultsPanelId,
      items: [
        {
          disabled: disableAllow,
          icon: 'check',
          name: i18n.ALLOW,
          onClick: () => {
            closePopover();

            const updates = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'add',
              update: 'allow',
            }));

            onListUpdated(updates);
          },
        },
        {
          disabled: disableDeny,
          icon: 'cross',
          name: i18n.DENY,
          onClick: () => {
            closePopover();

            const updates = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'remove',
              update: 'allow',
            }));

            onListUpdated(updates);
          },
        },
        {
          disabled: disableAnonymize,
          icon: 'eyeClosed',
          name: i18n.ANONYMIZE,
          onClick: () => {
            closePopover();

            const updates = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'add',
              update: 'allowReplacement',
            }));

            onListUpdated(updates);
          },
        },
        {
          disabled: disableUnanonymize,
          icon: 'eye',
          name: i18n.UNANONYMIZE,
          onClick: () => {
            closePopover();

            const updates = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'remove',
              update: 'allowReplacement',
            }));

            onListUpdated(updates);
          },
        },
        {
          isSeparator: true,
          key: 'sep',
        },
      ],
    },
  ];

  return nonDefaultsPanelItems;
};
