/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { CataloguePathField, CatalogueValueKind } from '@kbn/streams-schema';
import { resolvePathOptions } from '../../../services/component_catalogue';
import {
  AutocompleteSelector,
  type Suggestion,
} from '../../stream_management/data_management/shared/autocomplete_selector';
import { useDefinitionFormContext } from '../form_context';
import type { FormValue, ObjectValue } from '../values';

const LOCATION_FIELD = 'location';
const CONTEXT_FIELD = 'context';

/** Field icon tokens for the value kinds the catalogue reports for a path. */
const FIELD_ICON_BY_VALUE_KIND: Record<CatalogueValueKind, string> = {
  any: 'unknown',
  string: 'string',
  integer: 'integer',
  number: 'number',
  boolean: 'boolean',
  null: 'null',
  array: 'unknown',
  object: 'flattened',
};

interface PathFieldProps {
  field: CataloguePathField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  scope: ObjectValue;
  label: string;
  helpText?: string;
  error?: string;
  labelAppend?: React.ReactNode;
}

const asString = (value: FormValue | undefined): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * A path picker in the style of the processing editor's field selector. Paths
 * are suggested from the catalogue path set for the sibling `location` or `context`.
 */
export function PathField({
  field,
  value,
  onChange,
  scope,
  label,
  helpText,
  error,
  labelAppend,
}: PathFieldProps) {
  const { metadata, telemetry } = useDefinitionFormContext();
  const location = asString(scope[LOCATION_FIELD]);
  const context = asString(scope[CONTEXT_FIELD]);

  const suggestions = useMemo<Suggestion[]>(
    () =>
      resolvePathOptions(metadata, field.path_set, { location, context }, telemetry).map(
        (option) => ({
          name: option.path,
          type: FIELD_ICON_BY_VALUE_KIND[option.value_kind ?? 'any'],
          icon: true,
        })
      ),
    [context, field.path_set, location, metadata, telemetry]
  );

  return (
    <AutocompleteSelector
      value={asString(value)}
      onChange={(next) => onChange(next === '' ? undefined : next)}
      label={label}
      helpText={helpText}
      labelAppend={labelAppend}
      placeholder={
        field.ui?.placeholder ??
        i18n.translate('xpack.streams.componentDefinitionForm.path.placeholder', {
          defaultMessage: 'Select or type a path...',
        })
      }
      suggestions={suggestions}
      showIcon
      fullWidth
      isInvalid={error !== undefined}
      error={error}
      dataTestSubj={`componentDefinitionFormPath-${field.name}`}
    />
  );
}
