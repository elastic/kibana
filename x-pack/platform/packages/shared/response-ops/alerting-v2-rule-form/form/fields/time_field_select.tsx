/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { HttpStart } from '@kbn/core/public';
import { useWatch, useFormContext } from 'react-hook-form';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { firstFieldOption, getTimeFieldOptions } from '../../flyout/utils';
import { useDataFields } from '../hooks/use_data_fields';

interface Props {
  value?: string;
  onChange: (value: string) => void;
  services: {
    http: HttpStart;
    dataViews: DataViewsPublicPluginStart;
  };
}

export const TimeFieldSelect = React.forwardRef<HTMLSelectElement, Props>(
  ({ value, onChange, services }, ref) => {
    const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
    const { control } = useFormContext();
    const query = useWatch({ name: 'query', control });

    const handleFieldsSuccess = useCallback(
      (fields: DataViewFieldMap) => {
        const newTimeFieldOptions = getTimeFieldOptions(fields);
        setTimeFieldOptions([firstFieldOption, ...newTimeFieldOptions]);

        // If current value is not in the new options due to query change, reset it
        if (value && !newTimeFieldOptions.some((option) => option.value === value)) {
          onChange('');
        }
      },
      [onChange, value]
    );

    useDataFields({
      query,
      http: services.http,
      dataViews: services.dataViews,
      onSuccess: handleFieldsSuccess,
    });

    return (
      <EuiSelect
        options={timeFieldOptions}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={i18n.translate('xpack.alertingV2.ruleForm.timeFieldSelect.ariaLabel', {
          defaultMessage: 'Select time field for rule execution',
        })}
        inputRef={ref}
      />
    );
  }
);
