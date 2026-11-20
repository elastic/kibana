/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import type { CaseUI, CasesConfigurationUICustomField } from '../../../../common/ui/types';
import { getEmptyCellValue } from '../../empty_value';
import { builderMap as customFieldsBuilderMap } from '../../custom_fields/builder';
import {
  getExtendedFieldColumnKey,
  getExtendedFieldTableColumn,
} from '../components/extended_field_columns';

/** The case attributes read by the custom-field and extended-field columns. */
export type FieldColumnRow = Pick<CaseUI, 'customFields' | 'extendedFields'>;

interface GetFieldColumnsParams {
  templatesEnabled: boolean;
  globalInlineFields: InlineField[];
  customFields: CasesConfigurationUICustomField[];
  userProfiles: Map<string, UserProfileWithAvatar>;
}

/**
 * Builds the table columns of the configurable case fields, keyed by column key. With templates
 * v2, the columns come from the global field definitions and read the live `extendedFields`
 * values. Otherwise, they come from the legacy custom fields configuration.
 */
export const getFieldColumns = <T extends FieldColumnRow>({
  templatesEnabled,
  globalInlineFields,
  customFields,
  userProfiles,
}: GetFieldColumnsParams): Record<string, EuiBasicTableColumn<T>> => {
  const columns: Record<string, EuiBasicTableColumn<T>> = {};

  if (templatesEnabled) {
    globalInlineFields.forEach((field) => {
      columns[getExtendedFieldColumnKey(field)] = getExtendedFieldTableColumn<T>(
        field,
        userProfiles
      );
    });

    return columns;
  }

  customFields.forEach(({ key, type, label }) => {
    if (type in customFieldsBuilderMap) {
      // `sortable` is dropped: no custom field is sortable, and its `CaseUI`-typed callback
      // does not fit a narrower row type.
      const {
        render: renderCustomField,
        sortable,
        ...columnDefinition
      } = customFieldsBuilderMap[type]().getEuiTableColumn({ label });

      columns[key] = {
        ...columnDefinition,
        render: (theCase: T) => {
          const customField = theCase.customFields?.find(
            (element) => element.key === key && element.value !== null
          );

          if (!customField) {
            return getEmptyCellValue();
          }

          return renderCustomField(customField);
        },
      };
    }
  });

  return columns;
};
