/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type {
  CatalogueChoiceGroup,
  CatalogueFieldDefinition,
  CatalogueNamedFieldDefinition,
} from '@kbn/streams-schema';
import { resolveEnumOptions } from '../../services/component_catalogue';
import { findChoiceGroup, isUnselectedChoice } from './choice_groups';
import { isFieldAvailable, isFieldRequired } from './conditions';
import { canonicalValue, mapItemScopes, readItemScope, type FormContextValues } from './serialize';
import {
  isEmptyValue,
  isObjectValue,
  joinPointer,
  type FieldErrors,
  type FormValue,
  type ObjectValue,
} from './values';

const messages = {
  required: i18n.translate('xpack.streams.componentDefinitionForm.validation.required', {
    defaultMessage: 'This field is required',
  }),
  minLength: (count: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.minLength', {
      defaultMessage: 'Enter at least {count, plural, one {# character} other {# characters}}',
      values: { count },
    }),
  maxLength: (count: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.maxLength', {
      defaultMessage: 'Enter at most {count, plural, one {# character} other {# characters}}',
      values: { count },
    }),
  integer: i18n.translate('xpack.streams.componentDefinitionForm.validation.integer', {
    defaultMessage: 'Enter a whole number',
  }),
  minimum: (minimum: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.minimum', {
      defaultMessage: 'Must be at least {minimum}',
      values: { minimum },
    }),
  maximum: (maximum: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.maximum', {
      defaultMessage: 'Must be at most {maximum}',
      values: { maximum },
    }),
  minItems: (count: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.minItems', {
      defaultMessage: 'Add at least {count, plural, one {# item} other {# items}}',
      values: { count },
    }),
  maxItems: (count: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.maxItems', {
      defaultMessage: 'Add at most {count, plural, one {# item} other {# items}}',
      values: { count },
    }),
  uniqueItems: i18n.translate('xpack.streams.componentDefinitionForm.validation.uniqueItems', {
    defaultMessage: 'Items must be unique',
  }),
  minEntries: (count: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.minEntries', {
      defaultMessage: 'Add at least {count, plural, one {# entry} other {# entries}}',
      values: { count },
    }),
  maxEntries: (count: number) =>
    i18n.translate('xpack.streams.componentDefinitionForm.validation.maxEntries', {
      defaultMessage: 'Add at most {count, plural, one {# entry} other {# entries}}',
      values: { count },
    }),
  keyRequired: i18n.translate('xpack.streams.componentDefinitionForm.validation.keyRequired', {
    defaultMessage: 'Enter a key',
  }),
  invalidOption: i18n.translate('xpack.streams.componentDefinitionForm.validation.invalidOption', {
    defaultMessage: 'Choose one of the available options',
  }),
  itemTelemetry: i18n.translate('xpack.streams.componentDefinitionForm.validation.itemTelemetry', {
    defaultMessage:
      'Applies to signals this processor no longer handles. Change it or remove the item.',
  }),
};

/** An item scoped to a signal the component no longer handles would silently stop applying. */
const fitsTelemetry = (scope: FormValue, context: FormContextValues): boolean =>
  readItemScope(scope).every((signal) => context.telemetry.some((allowed) => allowed === signal));

/**
 * Flags array items scoped to signals the component no longer applies to. Without any signals
 * chosen there is nothing to compare against, so nothing is flagged.
 */
export const validateItemScopes = (
  fields: readonly CatalogueNamedFieldDefinition[],
  values: ObjectValue,
  context: FormContextValues
): FieldErrors => {
  const errors: FieldErrors = {};
  if (context.telemetry.length > 0) {
    mapItemScopes(fields, values, (scope, pointer) => {
      if (!fitsTelemetry(scope, context)) {
        errors[pointer] = messages.itemTelemetry;
      }
      return scope;
    });
  }
  return errors;
};

/**
 * What is wrong with the key of a map entry, if anything. A `key_pattern` is left for the
 * distributor, as is the `pattern` of a string: it checks both and says the same.
 */
export const mapKeyError = (key: string): string | undefined =>
  key === '' ? messages.keyRequired : undefined;

/** A map without entries is not written, so a required one counts as missing. */
const isEmptyMap = (field: CatalogueFieldDefinition, value: FormValue | undefined): boolean =>
  field.type === 'map' && isObjectValue(value) && Object.keys(value).length === 0;

/**
 * Asks for a value that would not be written, such as a map without entries, unless something
 * inside it is already flagged. Without this the row would go missing without a word once saved.
 */
const requireWrittenValue = (
  field: CatalogueFieldDefinition,
  value: FormValue,
  pointer: string,
  context: FormContextValues,
  errors: FieldErrors
): void => {
  const isFlagged = Object.keys(errors).some(
    (key) => key === pointer || key.startsWith(`${pointer}/`)
  );
  if (!isFlagged && canonicalValue(field, value, context.telemetry) === undefined) {
    errors[pointer] = messages.required;
  }
};

const validateValue = (
  field: CatalogueFieldDefinition,
  value: FormValue | undefined,
  pointer: string,
  context: FormContextValues,
  errors: FieldErrors
): void => {
  if (isEmptyValue(value)) {
    return;
  }
  switch (field.type) {
    case 'string': {
      if (typeof value !== 'string') {
        return;
      }
      if (field.min_length !== undefined && value.length < field.min_length) {
        errors[pointer] = messages.minLength(field.min_length);
      } else if (field.max_length !== undefined && value.length > field.max_length) {
        errors[pointer] = messages.maxLength(field.max_length);
      }
      return;
    }
    case 'integer':
    case 'number': {
      if (typeof value !== 'number') {
        return;
      }
      if (field.type === 'integer' && !Number.isInteger(value)) {
        errors[pointer] = messages.integer;
      } else if (field.minimum !== undefined && value < field.minimum) {
        errors[pointer] = messages.minimum(field.minimum);
      } else if (field.maximum !== undefined && value > field.maximum) {
        errors[pointer] = messages.maximum(field.maximum);
      }
      return;
    }
    case 'enum': {
      const options = resolveEnumOptions(field, context.metadata, context.telemetry);
      if (!options.some((option) => option.value === value)) {
        errors[pointer] = messages.invalidOption;
      }
      return;
    }
    case 'object':
      if (isObjectValue(value)) {
        validateObject(field.fields, field.choice_groups, value, pointer, context, errors);
      }
      return;
    case 'array': {
      if (!Array.isArray(value)) {
        return;
      }
      if (field.min_items !== undefined && value.length < field.min_items) {
        errors[pointer] = messages.minItems(field.min_items);
      } else if (field.max_items !== undefined && value.length > field.max_items) {
        errors[pointer] = messages.maxItems(field.max_items);
      } else if (
        field.unique_items &&
        value.some(
          (item, index) =>
            !isEmptyValue(item) && value.findIndex((other) => isEqual(other, item)) !== index
        )
      ) {
        errors[pointer] = messages.uniqueItems;
      }
      value.forEach((item, index) => {
        const itemPointer = joinPointer(pointer, index);
        // An empty row is not written, so it would go missing without a word once saved.
        if (isEmptyValue(item)) {
          errors[itemPointer] = messages.required;
          return;
        }
        validateValue(field.items, item, itemPointer, context, errors);
        // An object row is written even when nothing in it is.
        if (field.items.type !== 'object') {
          requireWrittenValue(field.items, item, itemPointer, context, errors);
        }
      });
      return;
    }
    case 'map': {
      if (!isObjectValue(value)) {
        return;
      }
      const entries = Object.entries(value);
      // A map without entries is not written, so only a required one has to have some.
      if (entries.length === 0) {
        return;
      }
      if (field.min_entries !== undefined && entries.length < field.min_entries) {
        errors[pointer] = messages.minEntries(field.min_entries);
      } else if (field.max_entries !== undefined && entries.length > field.max_entries) {
        errors[pointer] = messages.maxEntries(field.max_entries);
      }
      for (const [key, item] of entries) {
        // A key has no pointer of its own; like the distributor, its error goes on the entry.
        const entryPointer = joinPointer(pointer, key);
        const keyError = mapKeyError(key);
        if (keyError !== undefined) {
          errors[entryPointer] = keyError;
        } else if (isEmptyValue(item)) {
          // As with a list row, an entry without a value is not written.
          errors[entryPointer] = messages.required;
        } else {
          validateValue(field.value_schema, item, entryPointer, context, errors);
          requireWrittenValue(field.value_schema, item, entryPointer, context, errors);
        }
      }
      return;
    }
    default:
      return;
  }
};

/** Client-side checks for a quick feedback loop; the distributor stays authoritative. */
export const validateObject = (
  fields: readonly CatalogueNamedFieldDefinition[],
  choiceGroups: readonly CatalogueChoiceGroup[] | undefined,
  value: ObjectValue,
  pointer: string,
  context: FormContextValues,
  errors: FieldErrors = {}
): FieldErrors => {
  for (const field of fields) {
    if (
      !isFieldAvailable(field, value, context.telemetry) ||
      isUnselectedChoice(choiceGroups, value, field.name)
    ) {
      continue;
    }
    const fieldPointer = joinPointer(pointer, field.name);
    const fieldValue = value[field.name];
    const required =
      isFieldRequired(field, value, context.telemetry) ||
      findChoiceGroup(choiceGroups, field.name)?.min_selected === 1;
    if (required && (isEmptyValue(fieldValue) || isEmptyMap(field, fieldValue))) {
      errors[fieldPointer] = messages.required;
      continue;
    }
    validateValue(field, fieldValue, fieldPointer, context, errors);
  }
  return errors;
};

/**
 * Validates the form's values. Fields named in `suppliedElsewhere` (e.g. by
 * telemetry-scoped config entries the form keeps as-is) are only checked when
 * the form sets them.
 */
export const validateValues = (
  fields: readonly CatalogueNamedFieldDefinition[],
  values: ObjectValue,
  context: FormContextValues,
  suppliedElsewhere: ReadonlySet<string> = new Set()
): FieldErrors => ({
  ...validateObject(
    fields.filter(({ name }) => !(suppliedElsewhere.has(name) && isEmptyValue(values[name]))),
    undefined,
    values,
    '',
    context
  ),
  ...validateItemScopes(fields, values, context),
});
