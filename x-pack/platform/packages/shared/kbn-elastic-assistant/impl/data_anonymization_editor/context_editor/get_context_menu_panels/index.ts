/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';
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
  selected,
  handleRowChecked,
}: {
  disableAllow: boolean;
  disableAnonymize: boolean;
  disableDeny: boolean;
  disableUnanonymize: boolean;
  closePopover: () => void;
  onListUpdated: OnListUpdated;
  selected: FindAnonymizationFieldsResponse['data'];
  handleRowChecked: HandleRowChecked;
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

            const updates: BatchUpdateListItem[] = selected.map<BatchUpdateListItem>(
              ({ field }) => ({
                field,
                operation: 'add',
                update: 'allow',
              })
            );
            if (updates.length === 1) {
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

            const updates: BatchUpdateListItem[] = selected.map<BatchUpdateListItem>(
              ({ field }) => ({
                field,
                operation: 'remove',
                update: 'allow',
              })
            );
            if (updates.length === 1) {
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

            const updates: BatchUpdateListItem[] = selected.map<BatchUpdateListItem>(
              ({ field }) => ({
                field,
                operation: 'add',
                update: 'allowReplacement',
              })
            );
            if (updates.length === 1) {
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

            const updates: BatchUpdateListItem[] = selected.map<BatchUpdateListItem>(
              ({ field }) => ({
                field,
                operation: 'remove',
                update: 'allowReplacement',
              })
            );
            if (updates.length === 1) {
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
