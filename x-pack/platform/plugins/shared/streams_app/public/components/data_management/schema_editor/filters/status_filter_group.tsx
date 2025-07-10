/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { FilterGroup } from './filter_group';
import { FIELD_STATUS_MAP } from '../constants';
import { TControlsChangeHandler } from '../hooks/use_controls';
import { SchemaFieldStatus } from '../types';
import { useSchemaEditorContext } from '../schema_editor_context';

const BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.fieldStatusFilterGroupButtonLabel',
  { defaultMessage: 'Status' }
);

export const FieldStatusFilterGroup = ({ onChange }: { onChange: TControlsChangeHandler }) => {
  const { fields } = useSchemaEditorContext();

  const fieldStatus = useMemo(() => uniq(fields.map((field) => field.status)), [fields]);

  const [items, setItems] = useState<EuiSelectableOption[]>(() => getStatusOptions(fieldStatus));

  // This side effect is due to the fact that the available field status can be updated once the unmapped fields are fetched.
  useEffect(() => {
    setItems((prevItems) => {
      const prevSelection = new Map(prevItems.map((item) => [item.key, item.checked]));

      const nextItems = getStatusOptions(fieldStatus);

      nextItems.forEach((item) => {
        if (prevSelection.has(item.key)) {
          item.checked = prevSelection.get(item.key);
        }
      });

      return nextItems;
    });
  }, [fieldStatus]);

  const onChangeItems = useCallback<Required<EuiSelectableProps>['onChange']>(
    (nextItems) => {
      setItems(nextItems);
      onChange({
        status: nextItems
          .filter((nextItem) => nextItem.checked === 'on')
          .map((item) => item.key as SchemaFieldStatus),
      });
    },
    [onChange]
  );

  return (
    <FilterGroup items={items} filterGroupButtonLabel={BUTTON_LABEL} onChange={onChangeItems} />
  );
};

const getStatusOptions = (fieldStatus: SchemaFieldStatus[]): EuiSelectableOption[] => {
  return fieldStatus.map((key) => ({
    label: FIELD_STATUS_MAP[key].label,
    key,
  }));
};
