/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertTypes } from '@kbn/streamlang/types/formats';
import { FieldNameWithIcon } from '@kbn/react-field';
import { capitalize } from 'lodash';
import type { ConvertFormState } from '../../../../types';

const typeSelectorOptions = convertTypes.map((type) => ({
  value: type,
  inputDisplay: <FieldNameWithIcon name={capitalize(type)} type={type} />,
}));

export const ConvertTypeSelector = () => {
  const { field } = useController<ConvertFormState, 'type'>({ name: 'type' });

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTypeLabel',
        { defaultMessage: 'Type' }
      )}
      helpText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.convertTypeHelpText',
        { defaultMessage: 'Field data type for the output.' }
      )}
      fullWidth
    >
      <EuiSuperSelect
        data-test-subj="streamsAppConvertTypeSelector"
        onChange={field.onChange}
        valueOfSelected={field.value}
        options={typeSelectorOptions}
        fullWidth
        aria-label={i18n.translate('xpack.streams.fieldFormType.typeSelectAriaLabel', {
          defaultMessage: 'Field type',
        })}
      />
    </EuiFormRow>
  );
};
