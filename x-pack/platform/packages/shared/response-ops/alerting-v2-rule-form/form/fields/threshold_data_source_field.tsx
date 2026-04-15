/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiSuperSelect, type EuiSuperSelectOption } from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '../types';
import { useRuleFormMeta, useRuleFormServices } from '../contexts';
import {
  DEFAULT_THRESHOLD_DATA_SOURCE,
  THRESHOLD_DATA_SOURCE_CHOICES,
} from '../threshold_builder_constants';

const toSelectOptions = (titles: string[]): Array<EuiSuperSelectOption<string>> =>
  titles.map((title) => ({ value: title, inputDisplay: title }));

export const ThresholdDataSourceField = () => {
  const { dataViews } = useRuleFormServices();
  const { layout } = useRuleFormMeta();
  const { control } = useFormContext<FormValues>();
  const compressed = layout === 'flyout';

  const [dataViewList, setDataViewList] = useState<DataViewListItem[]>([]);
  const [listError, setListError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await dataViews.getIdsWithTitle();
        if (!cancelled) {
          setDataViewList(list);
          setListError(false);
        }
      } catch {
        if (!cancelled) {
          setListError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataViews]);

  const buildOptionsForValue = useCallback(
    (selected: string | undefined): Array<EuiSuperSelectOption<string>> => {
      const titlesFromViews = [...dataViewList]
        .map((d) => d.title)
        .filter((t): t is string => Boolean(t?.trim()))
        .sort((a, b) => a.localeCompare(b));

      const baseTitles =
        listError || titlesFromViews.length === 0
          ? [...THRESHOLD_DATA_SOURCE_CHOICES]
          : titlesFromViews;

      const merged = new Set(baseTitles);
      const trimmedSelected = selected?.trim();
      if (trimmedSelected && !merged.has(trimmedSelected)) {
        merged.add(trimmedSelected);
      }

      return toSelectOptions([...merged].sort((a, b) => a.localeCompare(b)));
    },
    [dataViewList, listError]
  );

  const dataSourceRowId = 'ruleV2FormThresholdDataSource';

  return (
    <Controller
      name="thresholdDataSource"
      control={control}
      defaultValue={DEFAULT_THRESHOLD_DATA_SOURCE}
      render={({ field, fieldState: { error } }) => {
        const options = buildOptionsForValue(field.value);

        const valueOfSelected =
          field.value && options.some((o) => o.value === field.value)
            ? field.value
            : options[0]?.value ?? DEFAULT_THRESHOLD_DATA_SOURCE;

        return (
          <EuiFormRow
            id={dataSourceRowId}
            label={i18n.translate('xpack.alertingV2.ruleForm.thresholdDataSource.label', {
              defaultMessage: 'Data source',
            })}
            isInvalid={!!error}
            error={error?.message}
            fullWidth
          >
            <EuiSuperSelect
              id={dataSourceRowId}
              data-test-subj="ruleV2FormThresholdDataSource"
              options={options}
              valueOfSelected={valueOfSelected}
              onChange={field.onChange}
              onBlur={field.onBlur}
              buttonRef={field.ref}
              compressed={compressed}
              fullWidth
              hasDividers
              aria-label={i18n.translate(
                'xpack.alertingV2.ruleForm.thresholdDataSource.ariaLabel',
                {
                  defaultMessage: 'Data source',
                }
              )}
            />
          </EuiFormRow>
        );
      }}
    />
  );
};
