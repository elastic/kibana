/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiBasicTable } from '@elastic/eui';
import React from 'react';
import { ContentPackObject, ContentPackSavedObject } from '@kbn/content-packs-schema';
import { DashboardAttributes } from '@kbn/dashboard-plugin/common/content_management/v2';
import { capitalize, compact, uniqBy } from 'lodash';

export function ContentPackObjectsList({
  objects,
  onSelectionChange,
}: {
  objects: ContentPackObject[];
  onSelectionChange: (objects: ContentPackObject[]) => void;
}) {
  return (
    <EuiBasicTable
      items={objects}
      itemId={(record: ContentPackObject) => record.content.id}
      columns={[
        {
          name: 'Asset name',
          render: (record: ContentPackObject) => {
            if (record.type === 'saved_object') {
              const { content } = record as ContentPackSavedObject;

              if (content.type === 'dashboard') {
                return (content.attributes as DashboardAttributes).title;
              }
            }

            return 'unknown object type';
          },
          truncateText: true,
        },
        {
          name: 'Type',
          render: (record: ContentPackObject) => {
            const type = record.type === 'saved_object' ? record.content.type : record.type;
            const iconType = 'dashboardApp';
            return (
              <EuiBadge color="hollow" iconType={iconType} iconSide="left">
                {capitalize(type)}
              </EuiBadge>
            );
          },
        },
      ]}
      rowHeader="objectName"
      selection={{
        onSelectionChange: (selectedObjects: ContentPackObject[]) => {
          onSelectionChange(selectedObjects);
        },
      }}
    />
  );
}

export function includeReferences(
  allObjects: ContentPackObject[],
  selectedObjects: ContentPackObject[]
) {
  return selectedObjects.flatMap((object) => {
    if (object.type !== 'saved_object') {
      return [object];
    }

    const references = compact(
      uniqBy(object.content.references, (ref) => ref.id).map((ref) =>
        allObjects.find(({ content: { id } }) => id === ref.id)
      )
    );
    return [...references, object];
  });
}
