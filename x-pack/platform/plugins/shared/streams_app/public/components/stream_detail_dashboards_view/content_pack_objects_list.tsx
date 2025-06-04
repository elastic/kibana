/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiBasicTable } from '@elastic/eui';
import React from 'react';
import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import { capitalize } from 'lodash';
import { ContentPackEntry } from '@kbn/content-packs-schema';

export function ContentPackObjectsList({
  objects,
  onSelectionChange,
}: {
  objects: ContentPackEntry[];
  onSelectionChange: (objects: ContentPackEntry[]) => void;
}) {
  return (
    <EuiBasicTable
      items={objects.filter(({ type }) => type === 'dashboard')}
      itemId={(entry: ContentPackEntry) => entry.id}
      columns={[
        {
          name: 'Asset name',
          render: (entry: ContentPackEntry) => {
            if (entry.type === 'dashboard') {
              return (entry.attributes as DashboardSavedObjectAttributes).title;
            }

            return 'unknown object type';
          },
          truncateText: true,
        },
        {
          name: 'Type',
          render: (entry: ContentPackEntry) => {
            const iconType = 'dashboardApp';
            return (
              <EuiBadge color="hollow" iconType={iconType} iconSide="left">
                {capitalize(entry.type)}
              </EuiBadge>
            );
          },
        },
      ]}
      rowHeader="objectName"
      selection={{
        onSelectionChange: (selectedObjects: ContentPackEntry[]) => {
          onSelectionChange(selectedObjects);
        },
      }}
    />
  );
}
