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
import { FIELD_TYPE_MAP, FieldTypeOption } from '../constants';
import { TControlsChangeHandler } from '../hooks/use_controls';
import { useSchemaEditorContext } from '../schema_editor_context';

const BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailSchemaEditor.fieldTypeFilterGroupButtonLabel',
  { defaultMessage: 'Type' }
);

export const FieldTypeFilterGroup = ({ onChange }: { onChange: TControlsChangeHandler }) => {
  const { fields } = useSchemaEditorContext();

  const fieldTypes = useMemo(
    () =>
      uniq(
        fields
          .map((field) => field.type)
          .filter((type): type is FieldTypeOption => type !== undefined)
      ),
    [fields]
  );

  const [items, setItems] = useState<EuiSelectableOption[]>(() => getTypeOptions(fieldTypes));

  // This side effect is due to the fact that the available field status can be updated once the unmapped fields are fetched.
  useEffect(() => {
    setItems((prevItems) => {
      const prevSelection = new Map(prevItems.map((item) => [item.key, item.checked]));

      const nextItems = getTypeOptions(fieldTypes);

      nextItems.forEach((item) => {
        if (prevSelection.has(item.key)) {
          item.checked = prevSelection.get(item.key);
        }
      });

      return nextItems;
    });
  }, [fieldTypes]);

  const onChangeItems = useCallback<Required<EuiSelectableProps>['onChange']>(
    (nextItems) => {
      setItems(nextItems);
      onChange({
        type: nextItems
          .filter((nextItem) => nextItem.checked === 'on')
          .map((item) => item.key as FieldTypeOption),
      });
    },
    [onChange]
  );

  return (
    <FilterGroup items={items} filterGroupButtonLabel={BUTTON_LABEL} onChange={onChangeItems} />
  );
};

const getTypeOptions = (fieldStatus: FieldTypeOption[]): EuiSelectableOption[] => {
  return fieldStatus.map((key) => ({
    label: FIELD_TYPE_MAP[key].label,
    key,
  }));
};
