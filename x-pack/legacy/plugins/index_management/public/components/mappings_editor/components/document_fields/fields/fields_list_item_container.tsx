/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useCallback } from 'react';

import { useState, useDispatch } from '../../../mappings_state';
import { NormalizedField } from '../../../types';
import { FieldsListItem } from './fields_list_item';

interface Props {
  field: NormalizedField;
  treeDepth: number;
}

export const FieldsListItemContainer = React.memo(({ field, treeDepth }: Props) => {
  const dispatch = useDispatch();
  const {
    documentFields: { status, fieldToAddFieldTo, fieldToEdit },
    fields: { byId, maxNestedDepth },
  } = useState();

  const getField = (fieldId: string) => byId[fieldId];

  const { id, childFields, hasChildFields, hasMultiFields, parentId } = field;
  const parentField = parentId !== undefined ? byId[parentId] : undefined;

  const isMultiField = parentField !== undefined ? parentField.canHaveMultiFields === true : false;
  const isHighlighted = fieldToEdit === id;
  const isDimmed = status === 'editingField' && fieldToEdit !== id;
  const isCreateFieldFormVisible = status === 'creatingField' && fieldToAddFieldTo === id;
  const areActionButtonsVisible = status === 'idle';
  const childFieldsArray = useMemo(
    () => (hasChildFields || hasMultiFields ? childFields!.map(getField) : []),
    [childFields]
  );

  const addField = useCallback(() => {
    dispatch({
      type: 'documentField.createField',
      value: id,
    });
  }, [id]);

  const editField = useCallback(() => {
    dispatch({
      type: 'documentField.editField',
      value: id,
    });
  }, [id]);

  const toggleExpand = useCallback(() => {
    dispatch({ type: 'field.toggleExpand', value: { fieldId: id } });
  }, [id]);

  return (
    <FieldsListItem
      field={field}
      treeDepth={treeDepth}
      isHighlighted={isHighlighted}
      isDimmed={isDimmed}
      isMultiField={isMultiField}
      isCreateFieldFormVisible={isCreateFieldFormVisible}
      areActionButtonsVisible={areActionButtonsVisible}
      childFieldsArray={childFieldsArray}
      maxNestedDepth={maxNestedDepth}
      addField={addField}
      editField={editField}
      toggleExpand={toggleExpand}
    />
  );
});
