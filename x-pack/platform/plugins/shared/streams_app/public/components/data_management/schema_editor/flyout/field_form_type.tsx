/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import React, { useEffect } from 'react';
import { getRegularEcsField } from '@kbn/streams-schema';
import { EcsRecommendation } from './ecs_recommendation';
import { FieldType } from '../field_type';
import { useKibana } from '../../../../hooks/use_kibana';
import { EMPTY_CONTENT, FIELD_TYPE_MAP, FieldTypeOption } from '../constants';
import { MappedSchemaField, SchemaField } from '../types';

export const FieldFormType = ({
  field,
  isEditing,
  onTypeChange,
}: {
  field: SchemaField;
  isEditing: boolean;
  onTypeChange: FieldTypeSelectorProps['onChange'];
}) => {
  const { useFieldsMetadata } = useKibana().dependencies.start.fieldsMetadata;

  const ecsFieldName = getRegularEcsField(field.name);

  const { fieldsMetadata, loading } = useFieldsMetadata(
    { attributes: ['type'], fieldNames: [ecsFieldName] },
    [field]
  );

  // Propagate recommendation to state if a type is not already set
  const recommendation = fieldsMetadata?.[ecsFieldName]?.type;

  useEffect(() => {
    if (
      !loading &&
      recommendation !== undefined &&
      // Supported type
      recommendation in FIELD_TYPE_MAP &&
      !field.type
    ) {
      onTypeChange(recommendation as MappedSchemaField['type']);
    }
  }, [field, loading, recommendation, onTypeChange]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        {isEditing ? (
          <FieldTypeSelector value={field.type} onChange={onTypeChange} isLoading={loading} />
        ) : field.type ? (
          <FieldType type={field.type} />
        ) : (
          EMPTY_CONTENT
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EcsRecommendation isLoading={loading} recommendation={recommendation} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface FieldTypeSelectorProps {
  isLoading?: boolean;
  onChange: (value: FieldTypeOption) => void;
  value?: FieldTypeOption;
}

const typeSelectorOptions = Object.entries(FIELD_TYPE_MAP)
  .filter(([_, { readonly }]) => !readonly)
  .map(([optionKey, { label }]) => ({
    text: label,
    value: optionKey,
  }));

const FieldTypeSelector = ({ value, onChange, isLoading = false }: FieldTypeSelectorProps) => {
  return (
    <EuiSelect
      isLoading={isLoading}
      data-test-subj="streamsAppFieldFormTypeSelect"
      hasNoInitialSelection={!value}
      onChange={(event) => {
        onChange(event.target.value as FieldTypeOption);
      }}
      value={value}
      options={typeSelectorOptions}
    />
  );
};
