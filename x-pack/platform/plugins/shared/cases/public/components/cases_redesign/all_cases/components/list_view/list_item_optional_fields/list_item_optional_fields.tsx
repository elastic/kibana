/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';

import { getExtendedFieldContent, getListItemFieldContent } from './field_content_getters';
import { ListItemFieldText } from './list_item_field_text';
import type { ListItemFieldContent, ListItemOptionalFieldsProps } from './types';
import { useCasesConfig } from '../../../../../../common/lib/kibana';
import { getExtendedFieldColumnKey } from '../../../../../all_cases/extended_field_columns';
import { useGlobalInlineFields } from '../../../../../all_cases/hooks/use_global_inline_fields';

export const ListItemOptionalFields: React.FC<ListItemOptionalFieldsProps> = ({
  theCase,
  selectedFields,
  userProfiles,
}) => {
  const { euiTheme } = useEuiTheme();
  const { templatesEnabled } = useCasesConfig();
  const { globalInlineFields } = useGlobalInlineFields({ enabled: templatesEnabled });

  // Under templates v2 the selected "custom" fields are extended fields keyed `<name>_as_<type>`;
  // map each key to its definition so values resolve from `extendedFields` (parity with the table).
  const globalInlineFieldsByKey = useMemo(() => {
    const map = new Map<string, (typeof globalInlineFields)[number]>();
    if (templatesEnabled) {
      for (const field of globalInlineFields) {
        map.set(getExtendedFieldColumnKey(field), field);
      }
    }
    return map;
  }, [templatesEnabled, globalInlineFields]);

  const styles = useMemo(
    () => ({
      container: css`
        position: relative;
        margin-top: ${euiTheme.size.s};
      `,
    }),
    [euiTheme]
  );

  const visibleFields = useMemo(
    () =>
      selectedFields.reduce<Array<ListItemFieldContent & { field: string }>>(
        (acc, { isChecked, field, name }) => {
          if (isChecked) {
            const globalInlineField = globalInlineFieldsByKey.get(field);
            const fieldContent = globalInlineField
              ? getExtendedFieldContent(globalInlineField, theCase, userProfiles)
              : getListItemFieldContent(field, theCase);
            if (fieldContent != null) {
              acc.push({ ...fieldContent, field, label: name ?? fieldContent.label });
            }
          }
          return acc;
        },
        []
      ),
    [selectedFields, theCase, globalInlineFieldsByKey, userProfiles]
  );

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      wrap
      data-test-subj="cases-list-item-optional-fields"
      css={styles.container}
    >
      {visibleFields.map(({ field, label, content, testSubj }) => (
        <ListItemFieldText key={field} label={label} testSubj={testSubj}>
          {content}
        </ListItemFieldText>
      ))}
    </EuiFlexGroup>
  );
};

ListItemOptionalFields.displayName = 'ListItemOptionalFields';
