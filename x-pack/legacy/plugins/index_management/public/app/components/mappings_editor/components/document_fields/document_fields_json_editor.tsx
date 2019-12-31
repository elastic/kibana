/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useCallback } from 'react';

import { useDispatch } from '../../mappings_state';
import { JsonEditor } from '../../shared_imports';

export interface Props {
  defaultValue: object;
}

export const DocumentFieldsJsonEditor = ({ defaultValue }: Props) => {
  const dispatch = useDispatch();
  const defaultValueRef = useRef(defaultValue);
  const onUpdate = useCallback(
    ({ data, isValid }) =>
      dispatch({
        type: 'fieldsJsonEditor.update',
        value: { json: data.format(), isValid },
      }),
    [dispatch]
  );
  return <JsonEditor onUpdate={onUpdate} defaultValue={defaultValueRef.current} />;
};
