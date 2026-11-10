/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { UseArray, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_PAIRS,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
} from '../../../common/constants';
import * as i18n from './translations';

const { emptyField, maxLengthField } = fieldValidators;

/** Form path of the metadata rows; the form turns them into a key/value record on submit. */
export const METADATA_PAIRS_PATH = 'metadataPairs';

export interface MetadataPair {
  key: string;
  value: string;
}

/** Turns stored metadata into editable rows, in key order. */
export const metadataToPairs = (metadata?: Record<string, string>): MetadataPair[] =>
  Object.entries(metadata ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));

/** Turns the edited rows into metadata, trimming keys and dropping blank rows. */
export const pairsToMetadata = (pairs?: MetadataPair[]): Record<string, string> =>
  Object.fromEntries(
    (pairs ?? [])
      .map(({ key, value }) => [key.trim(), value] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0)
  );

const keyValidations: Array<{ validator: ValidationFunc }> = [
  { validator: emptyField(i18n.METADATA_KEY_REQUIRED) },
  {
    validator: maxLengthField({
      length: MAX_OBSERVABLE_METADATA_KEY_LENGTH,
      message: i18n.METADATA_KEY_TOO_LONG(MAX_OBSERVABLE_METADATA_KEY_LENGTH),
    }),
  },
  {
    validator: ({ value }) =>
      typeof value === 'string' && value.includes('*')
        ? { message: i18n.METADATA_KEY_INVALID }
        : undefined,
  },
  {
    validator: ({ value, path, form }) => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return;
      }
      const pairs: MetadataPair[] = form.getFormData()[METADATA_PAIRS_PATH] ?? [];
      const isRepeated = pairs.some(
        (pair, index) =>
          pair.key.trim() === value.trim() && path !== `${METADATA_PAIRS_PATH}[${index}].key`
      );
      return isRepeated ? { message: i18n.METADATA_KEY_DUPLICATE } : undefined;
    },
  },
];

const valueValidations: Array<{ validator: ValidationFunc }> = [
  { validator: emptyField(i18n.METADATA_VALUE_REQUIRED) },
  {
    validator: maxLengthField({
      length: MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
      message: i18n.METADATA_VALUE_TOO_LONG(MAX_OBSERVABLE_METADATA_VALUE_LENGTH),
    }),
  },
];

/**
 * Edits the free-form metadata of an observable value: up to 20 key and value pairs, shared by
 * every case of the space that holds the value.
 */
export const ObservableMetadataFields = () => (
  <>
    <EuiTitle size="xxs">
      <h4>{i18n.OBSERVABLE_METADATA}</h4>
    </EuiTitle>
    <EuiText size="xs" color="subdued">
      <p>{i18n.METADATA_HELP_TEXT(MAX_OBSERVABLE_METADATA_PAIRS)}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <UseArray path={METADATA_PAIRS_PATH} initialNumberOfItems={0}>
      {({ addItem, items, removeItem }) => {
        const isAtLimit = items.length >= MAX_OBSERVABLE_METADATA_PAIRS;

        return (
          <>
            {items.map((item) => (
              <EuiFlexGroup
                key={item.id}
                gutterSize="s"
                alignItems="flexStart"
                responsive={false}
                data-test-subj="observable-metadata-row"
              >
                <EuiFlexItem>
                  <UseField
                    path={`${item.path}.key`}
                    config={{ label: i18n.METADATA_KEY_LABEL, validations: keyValidations }}
                    component={TextField}
                    componentProps={{
                      euiFieldProps: {
                        'data-test-subj': 'observable-metadata-key',
                        compressed: true,
                      },
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <UseField
                    path={`${item.path}.value`}
                    config={{ label: i18n.METADATA_VALUE_LABEL, validations: valueValidations }}
                    component={TextField}
                    componentProps={{
                      euiFieldProps: {
                        'data-test-subj': 'observable-metadata-value',
                        compressed: true,
                      },
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.REMOVE_METADATA} disableScreenReaderOutput>
                    <EuiButtonIcon
                      color="danger"
                      iconType="minusCircle"
                      aria-label={i18n.REMOVE_METADATA}
                      onClick={() => removeItem(item.id)}
                      data-test-subj="observable-metadata-remove"
                      css={{ marginTop: 24 }}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
            {isAtLimit ? (
              <EuiText size="xs" color="subdued" data-test-subj="observable-metadata-limit">
                <p>{i18n.METADATA_LIMIT_REACHED(MAX_OBSERVABLE_METADATA_PAIRS)}</p>
              </EuiText>
            ) : (
              <EuiButtonEmpty
                size="xs"
                iconType="plusCircle"
                onClick={addItem}
                data-test-subj="observable-metadata-add"
              >
                {i18n.ADD_METADATA}
              </EuiButtonEmpty>
            )}
          </>
        );
      }}
    </UseArray>
  </>
);

ObservableMetadataFields.displayName = 'ObservableMetadataFields';
