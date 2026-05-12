/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { MultiSelectFilter, type MultiSelectFilterOption } from '../filter/multi_select_filter';

interface ModelFamilyFilterProps {
  options: MultiSelectFilterOption[];
  selectedOptionKeys: string[];
  onChange: (newOptions: MultiSelectFilterOption[]) => void;
}

export const ModelFamilyFilter: React.FC<ModelFamilyFilterProps> = ({
  options,
  selectedOptionKeys,
  onChange,
}) => {
  return (
    <MultiSelectFilter
      buttonLabel={i18n.translate('xpack.searchInferenceEndpoints.modelFamilyFilter.buttonLabel', {
        defaultMessage: 'Model family',
      })}
      ariaLabel={i18n.translate(
        'xpack.searchInferenceEndpoints.modelFamilyFilter.button.ariaLabel',
        {
          defaultMessage: 'Select a model family to filter',
        }
      )}
      onChange={onChange}
      options={options}
      renderOption={(option) => option.label}
      selectedOptionKeys={selectedOptionKeys}
      dataTestSubj="modelFamilyFilterMultiselect"
    />
  );
};
