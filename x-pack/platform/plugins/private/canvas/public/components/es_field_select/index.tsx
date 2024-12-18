/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ESFieldSelect as Component, ESFieldSelectProps as Props } from './es_field_select';
import { getDataViewFields } from '../../lib/data_view_helpers';

type ESFieldSelectProps = Omit<Props, 'fields'>;

export const ESFieldSelect: React.FunctionComponent<ESFieldSelectProps> = (props) => {
  const { index, value, onChange } = props;
  const [fields, setFields] = useState<string[]>([]);
  const loadingFields = useRef(false);

  useEffect(() => {
    loadingFields.current = true;

    getDataViewFields(index)
      .then((newFields) => setFields(newFields || []))
      .finally(() => {
        loadingFields.current = false;
      });
  }, [index]);

  useEffect(() => {
    if (!loadingFields.current && value && !fields.includes(value)) {
      onChange(null);
    }
  }, [value, fields, onChange]);

  return <Component {...props} fields={fields} />;
};
