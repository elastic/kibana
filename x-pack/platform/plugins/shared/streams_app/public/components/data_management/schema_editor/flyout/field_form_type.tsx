/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { getRegularEcsField } from '@kbn/streams-schema';
import { EcsRecommendation } from './ecs_recommendation';
import { FieldType } from '../field_type';
import { useKibana } from '../../../../hooks/use_kibana';
import type { FieldTypeOption } from '../constants';
import { EMPTY_CONTENT, FIELD_TYPE_MAP } from '../constants';
import type { MappedSchemaField, SchemaField } from '../types';

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

const typeSelectorOptions = (Object.keys(FIELD_TYPE_MAP) as FieldTypeOption[])
  .filter((optionKey) => !FIELD_TYPE_MAP[optionKey].readonly)
  .map((optionKey) => ({
    value: optionKey,
    inputDisplay: <FieldType type={optionKey} />,
    'data-test-subj': `option-type-${optionKey}`,
  }));

export const FieldTypeSelector = ({
  value,
  onChange,
  isLoading = false,
}: FieldTypeSelectorProps) => {
  return (
    <EuiSuperSelect
      isLoading={isLoading}
      data-test-subj="streamsAppFieldFormTypeSelect"
      onChange={onChange}
      valueOfSelected={value}
      options={typeSelectorOptions}
      fullWidth
      aria-label={i18n.translate('xpack.streams.fieldFormType.typeSelectAriaLabel', {
        defaultMessage: 'Field type',
      })}
    />
  );
};
