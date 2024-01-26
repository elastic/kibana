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
export const SECONDARY_PANEL_ID = 'secondary-panel-id';

export const getContextMenuPanels = ({
  disableAllow,
  disableAnonymize,
  disableDeny,
  disableUnanonymize,
  closePopover,
  onListUpdated,
  onlyDefaults,
  selected,
}: {
  disableAllow: boolean;
  disableAnonymize: boolean;
  disableDeny: boolean;
  disableUnanonymize: boolean;
  closePopover: () => void;
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  selected: ContextEditorRow[];
  onlyDefaults: boolean;
}): EuiContextMenuPanelDescriptor[] => {
  const defaultsPanelId = onlyDefaults ? PRIMARY_PANEL_ID : SECONDARY_PANEL_ID;
  const nonDefaultsPanelId = onlyDefaults ? SECONDARY_PANEL_ID : PRIMARY_PANEL_ID;

  const allowByDefault = [
    !onlyDefaults
      ? {
          icon: 'check',
          name: i18n.ALLOW_BY_DEFAULT,
          onClick: () => {
            closePopover();

            const updateAllow = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'add',
              update: 'allow',
            }));

            const updateDefaultAllow = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'add',
              update: 'defaultAllow',
            }));

            onListUpdated([...updateAllow, ...updateDefaultAllow]);
          },
        }
      : [],
  ].flat();

  const defaultsPanelItems: EuiContextMenuPanelDescriptor[] = [
    {
      id: defaultsPanelId,
      title: i18n.DEFAULTS,
      items: [
        ...allowByDefault,
        {
          icon: 'cross',
          name: i18n.DENY_BY_DEFAULT,
          onClick: () => {
            closePopover();

            const updateAllow = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'remove',
              update: 'allow',
            }));

            const updateDefaultAllow = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'remove',
              update: 'defaultAllow',
            }));

            onListUpdated([...updateAllow, ...updateDefaultAllow]);
          },
        },
        {
          icon: 'eyeClosed',
          name: i18n.ANONYMIZE_BY_DEFAULT,
          onClick: () => {
            closePopover();

            const updateAllowReplacement = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'add',
              update: 'allowReplacement',
            }));

            const updateDefaultAllowReplacement = selected.map<BatchUpdateListItem>(
              ({ field }) => ({
                field,
                operation: 'add',
                update: 'defaultAllowReplacement',
              })
            );

            onListUpdated([...updateAllowReplacement, ...updateDefaultAllowReplacement]);
          },
        },
        {
          icon: 'eye',
          name: i18n.UNANONYMIZE_BY_DEFAULT,
          onClick: () => {
            closePopover();

            const updateAllowReplacement = selected.map<BatchUpdateListItem>(({ field }) => ({
              field,
              operation: 'remove',
              update: 'allowReplacement',
            }));

            const updateDefaultAllowReplacement = selected.map<BatchUpdateListItem>(
              ({ field }) => ({
                field,
                operation: 'remove',
                update: 'defaultAllowReplacement',
              })
            );

            onListUpdated([...updateAllowReplacement, ...updateDefaultAllowReplacement]);
          },
        },
      ],
    },
  ];

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
        {
          name: i18n.DEFAULTS,
          panel: defaultsPanelId,
        },
      ],
    },
    ...defaultsPanelItems,
  ];

  return onlyDefaults ? defaultsPanelItems : nonDefaultsPanelItems;
};
