/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FieldDefinitionConfig } from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import { SchemaField } from '../types';

interface FieldFormFormatProps {
  field: SchemaField;
  onChange: (format: SchemaField['format']) => void;
}

const DEFAULT_FORMAT = 'strict_date_optional_time||epoch_millis';

const POPULAR_FORMATS = [
  DEFAULT_FORMAT,
  'strict_date_optional_time',
  'date_optional_time',
  'epoch_millis',
  'basic_date_time',
] as const;

type PopularFormatOption = (typeof POPULAR_FORMATS)[number];

export const typeSupportsFormat = (type?: FieldDefinitionConfig['type']) => {
  if (!type) return false;
  return ['date'].includes(type);
};

export const FieldFormFormat = (props: FieldFormFormatProps) => {
  if (!typeSupportsFormat(props.field.type)) {
    return null;
  }
  return <FieldFormFormatSelection {...props} />;
};

const FieldFormFormatSelection = (props: FieldFormFormatProps) => {
  const [isFreeform, toggleIsFreeform] = useToggle(
    props.field.format !== undefined && !isPopularFormat(props.field.format)
  );

  const onToggle = useCallback(
    (e: EuiSwitchEvent) => {
      if (!e.target.checked && !isPopularFormat(props.field.format)) {
        props.onChange(undefined);
      }
      toggleIsFreeform();
    },
    [props, toggleIsFreeform]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        {isFreeform ? <FreeformFormatInput {...props} /> : <PopularFormatsSelector {...props} />}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSwitch
          label={i18n.translate('xpack.streams.fieldFormFormatSelection.freeformToggleLabel', {
            defaultMessage: 'Use freeform mode',
          })}
          checked={isFreeform}
          onChange={onToggle}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PopularFormatsSelector = (props: FieldFormFormatProps) => {
  return (
    <EuiSelect
      hasNoInitialSelection={
        props.field.format === undefined || !isPopularFormat(props.field.format)
      }
      data-test-subj="streamsAppSchemaEditorFieldFormatPopularFormats"
      onChange={(event) => {
        props.onChange(event.target.value as PopularFormatOption);
      }}
      value={props.field.format}
      options={POPULAR_FORMATS.map((format) => ({
        text: format,
        value: format,
      }))}
    />
  );
};

const FreeformFormatInput = (props: FieldFormFormatProps) => {
  return (
    <EuiFieldText
      data-test-subj="streamsAppFieldFormFormatField"
      placeholder="yyyy/MM/dd"
      value={props.field.format ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
};

const isPopularFormat = (value?: string): value is PopularFormatOption => {
  return POPULAR_FORMATS.includes(value as PopularFormatOption);
};
