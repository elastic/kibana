/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSwitch } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import type { SchemaField } from '../types';

interface FieldFormFormatProps {
  value: SchemaField['format'];
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

export const FieldFormFormat = ({ value, onChange }: FieldFormFormatProps) => {
  const [isFreeform, toggleIsFreeform] = useToggle(value !== undefined && !isPopularFormat(value));

  const onToggle = useCallback(
    (e: EuiSwitchEvent) => {
      if (!e.target.checked && !isPopularFormat(value)) {
        onChange(undefined);
      }
      toggleIsFreeform();
    },
    [onChange, value, toggleIsFreeform]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        {isFreeform ? (
          <FreeformFormatInput value={value} onChange={onChange} />
        ) : (
          <PopularFormatsSelector value={value} onChange={onChange} />
        )}
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

const PopularFormatsSelector = ({ onChange, value }: FieldFormFormatProps) => {
  return (
    <EuiSelect
      hasNoInitialSelection={value === undefined || !isPopularFormat(value)}
      data-test-subj="streamsAppSchemaEditorFieldFormatPopularFormats"
      onChange={(event) => {
        onChange(event.target.value as PopularFormatOption);
      }}
      value={value}
      options={POPULAR_FORMATS.map((format) => ({
        text: format,
        value: format,
      }))}
      fullWidth
    />
  );
};

const FreeformFormatInput = ({ value, onChange }: FieldFormFormatProps) => {
  return (
    <EuiFieldText
      data-test-subj="streamsAppFieldFormFormatField"
      placeholder="yyyy/MM/dd"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    />
  );
};

const isPopularFormat = (value?: string): value is PopularFormatOption => {
  return POPULAR_FORMATS.includes(value as PopularFormatOption);
};
