/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { FilterOptions } from '../../../types';
import type { MultiSelectFilterOption } from '../../filter/multi_select_filter';
import { MultiSelectFilter } from '../../filter/multi_select_filter';

interface Props {
  optionKeys: InferenceTaskType[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
  uniqueTaskTypes: Set<InferenceTaskType>;
}

export const TaskTypeFilter: React.FC<Props> = ({ optionKeys, onChange, uniqueTaskTypes }) => {
  const filterId: string = 'type';
  const onSystemFilterChange = (newOptions: MultiSelectFilterOption[]) => {
    onChange({
      [filterId]: newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key),
    });
  };

  const filteredOptions = useMemo(() => {
    return [...uniqueTaskTypes].map((type) => ({
      key: type,
      label: type,
    }));
  }, [uniqueTaskTypes]);

  return (
    <EuiFilterGroup>
      <MultiSelectFilter
        buttonLabel={i18n.translate('xpack.searchInferenceEndpoints.taskType', {
          defaultMessage: 'Type',
        })}
        ariaLabel={i18n.translate('xpack.searchInferenceEndpoints.taskType.ariaLabel', {
          defaultMessage: 'Task Type Options',
        })}
        onChange={onSystemFilterChange}
        options={filteredOptions}
        renderOption={(option) => option.label}
        selectedOptionKeys={optionKeys}
        dataTestSubj="type-field-endpoints"
      />
    </EuiFilterGroup>
  );
};
