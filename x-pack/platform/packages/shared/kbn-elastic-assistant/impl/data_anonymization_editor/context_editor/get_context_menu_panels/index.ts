/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import * as i18n from '../translations';
import type { BatchUpdateListItem } from '../types';
import type { OnListUpdated } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import type { HandleRowChecked } from '../selection/types';

export const PRIMARY_PANEL_ID = 'primary-panel-id';

export const getContextMenuPanels = ({
  disableAllow,
  disableAnonymize,
  disableDeny,
  disableUnanonymize,
  closePopover,
  onListUpdated,
  selectedField,
  selectedFields,
  handleRowChecked,
}: {
  disableAllow: boolean;
  disableAnonymize: boolean;
  disableDeny: boolean;
  disableUnanonymize: boolean;
  closePopover: () => void;
  onListUpdated: OnListUpdated;
  selectedField: string | undefined; // Selected field for a single row, undefined if applies to multiple rows
  selectedFields: string[]; // Selected fields for the entire table
  handleRowChecked: HandleRowChecked;
}): EuiContextMenuPanelDescriptor[] => {
  const nonDefaultsPanelId = PRIMARY_PANEL_ID;
  const updatedFields = selectedField ? [selectedField] : selectedFields;

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

            const updates: BatchUpdateListItem[] = updatedFields.map<BatchUpdateListItem>(
              (field) => ({
                field,
                operation: 'add',
                update: 'allow',
              })
            );
            if (selectedField) {
              handleRowChecked(updates[0].field);
            }
            onListUpdated(updates);
          },
        },
        {
          disabled: disableDeny,
          icon: 'cross',
          name: i18n.DENY,
          onClick: () => {
            closePopover();

            const updates: BatchUpdateListItem[] = updatedFields.map<BatchUpdateListItem>(
              (field) => ({
                field,
                operation: 'remove',
                update: 'allow',
              })
            );
            if (selectedField) {
              handleRowChecked(updates[0].field);
            }
            onListUpdated(updates);
          },
        },
        {
          disabled: disableAnonymize,
          icon: 'eyeClosed',
          name: i18n.ANONYMIZE,
          onClick: () => {
            closePopover();

            const updates: BatchUpdateListItem[] = updatedFields.map<BatchUpdateListItem>(
              (field) => ({
                field,
                operation: 'add',
                update: 'allowReplacement',
              })
            );
            if (selectedField) {
              handleRowChecked(updates[0].field);
            }
            onListUpdated(updates);
          },
        },
        {
          disabled: disableUnanonymize,
          icon: 'eye',
          name: i18n.UNANONYMIZE,
          onClick: () => {
            closePopover();

            const updates: BatchUpdateListItem[] = updatedFields.map<BatchUpdateListItem>(
              (field) => ({
                field,
                operation: 'remove',
                update: 'allowReplacement',
              })
            );
            if (selectedField) {
              handleRowChecked(updates[0].field);
            }
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
