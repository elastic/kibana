/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chrome } from 'ui/chrome';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectAttributes } from 'src/core/server';
import { NotificationsSetup } from 'src/core/public';
import { IndexPatternField } from './indexpattern';

interface SavedIndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
  typeMeta: string;
}

interface SavedRestrictionsObject {
  aggs: Record<
    string,
    Record<
      string,
      {
        agg: string;
        fixed_interval?: string;
        calendar_interval?: string;
        delay?: string;
        time_zone?: string;
      }
    >
  >;
}
type SavedRestrictionsInfo = SavedRestrictionsObject | undefined;

export const getIndexPatterns = (chrome: Chrome, notifications: NotificationsSetup) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return savedObjectsClient
    .find<SavedIndexPatternAttributes>({
      type: 'index-pattern',
      perPage: 1000, // TODO: Paginate index patterns
    })
    .then(resp => {
      return resp.savedObjects.map(savedObject => {
        const { id, attributes, type } = savedObject;
        return {
          ...attributes,
          id,
          type,
          title: attributes.title,
          fields: (JSON.parse(attributes.fields) as IndexPatternField[]).filter(
            ({ type: fieldType, esTypes }) =>
              fieldType !== 'string' || (esTypes && esTypes.includes('keyword'))
          ),
          typeMeta: attributes.typeMeta
            ? (JSON.parse(attributes.typeMeta) as SavedRestrictionsInfo)
            : undefined,
          fieldFormatMap: attributes.fieldFormatMap
            ? JSON.parse(attributes.fieldFormatMap)
            : undefined,
        };
      });
    })
    .catch(err => {
      notifications.toasts.addDanger('Failed to load index patterns');
    });
};
