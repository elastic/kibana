/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import type { CatalogueComponentReferenceField } from '@kbn/streams-schema';
import { labelOf } from '../field_helpers';
import { useDefinitionFormContext } from '../form_context';
import type { FormValue } from '../values';

interface ComponentReferenceControlProps {
  field: CatalogueComponentReferenceField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  isInvalid: boolean;
  controlId: string;
}

export function ComponentReferenceControl({
  field,
  value,
  onChange,
  isInvalid,
  controlId,
}: ComponentReferenceControlProps) {
  const { componentRefs } = useDefinitionFormContext();
  const options = componentRefs
    .filter(({ kind }) => kind !== 'source' && field.component_kinds.includes(kind))
    .map(({ id }) => ({ label: id }));
  const selected = (Array.isArray(value) ? value : value === undefined ? [] : [value]).flatMap(
    (item) => (typeof item === 'string' ? [{ label: item }] : [])
  );
  return (
    <EuiComboBox
      id={controlId}
      aria-label={labelOf(field)}
      compressed
      fullWidth
      isInvalid={isInvalid}
      options={options}
      selectedOptions={selected}
      singleSelection={field.multiple ? false : { asPlainText: true }}
      onChange={(next) => {
        const ids = next.map(({ label }) => label);
        onChange(field.multiple ? ids : ids[0]);
      }}
      data-test-subj={`componentDefinitionFormReference-${field.name}`}
    />
  );
}
