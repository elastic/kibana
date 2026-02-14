/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo } from 'react';
import { getRegularEcsField } from '@kbn/streams-schema';
import { EcsRecommendation } from './ecs_recommendation';
import { FieldType } from '../field_type';
import { useKibana } from '../../../../hooks/use_kibana';
import type { FieldTypeOption } from '../constants';
import { EMPTY_CONTENT, FIELD_TYPE_MAP } from '../constants';
import type { MappedSchemaField, SchemaField } from '../types';

/**
 * Returns a filtered and alphabetically sorted (by display label) list of field type options.
 * Excludes readonly types and conditionally excludes geo_point based on stream type and feature flag.
 */
export const getFieldTypeOptions = ({
  streamType,
  enableGeoPointSuggestions,
}: {
  streamType: 'classic' | 'wired';
  enableGeoPointSuggestions?: boolean;
}): FieldTypeOption[] => {
  return (Object.keys(FIELD_TYPE_MAP) as FieldTypeOption[])
    .filter((optionKey) => {
      if (FIELD_TYPE_MAP[optionKey].readonly) return false;
      if (optionKey === 'geo_point') {
        if (streamType !== 'classic') return false;
        if (enableGeoPointSuggestions === false) return false;
      }
      return true;
    })
    .sort((a, b) => FIELD_TYPE_MAP[a].label.localeCompare(FIELD_TYPE_MAP[b].label));
};

interface FieldFormTypeProps {
  field: SchemaField;
  isEditing: boolean;
  onTypeChange: FieldTypeSelectorProps['onChange'];
  streamType: 'classic' | 'wired';
  enableGeoPointSuggestions?: boolean;
}

export const FieldFormType = ({
  field,
  isEditing,
  onTypeChange,
  streamType,
  enableGeoPointSuggestions,
}: FieldFormTypeProps) => {
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
      !(enableGeoPointSuggestions === false && recommendation === 'geo_point') &&
      !field.type
    ) {
      onTypeChange(recommendation as MappedSchemaField['type']);
    }
  }, [enableGeoPointSuggestions, field, loading, recommendation, onTypeChange]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        {isEditing ? (
          <FieldTypeSelector
            value={field.type}
            onChange={onTypeChange}
            isLoading={loading}
            streamType={streamType}
            enableGeoPointSuggestions={enableGeoPointSuggestions}
          />
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
  streamType: 'classic' | 'wired';
  enableGeoPointSuggestions?: boolean;
}

export const FieldTypeSelector = ({
  value,
  onChange,
  isLoading = false,
  streamType,
  enableGeoPointSuggestions,
}: FieldTypeSelectorProps) => {
  const typeSelectorOptions = useMemo(() => {
    return getFieldTypeOptions({ streamType, enableGeoPointSuggestions }).map((optionKey) => ({
      value: optionKey,
      inputDisplay: <FieldType type={optionKey} />,
      'data-test-subj': `option-type-${optionKey}`,
    }));
  }, [enableGeoPointSuggestions, streamType]);

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
