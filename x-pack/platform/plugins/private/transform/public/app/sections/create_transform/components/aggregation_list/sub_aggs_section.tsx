/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiSpacer, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldStatsInfoButton, useFieldStatsTrigger } from '@kbn/ml-field-stats-flyout';
import { AggListForm } from './list_form';
import { DropDown } from '../aggregation_dropdown';
import type { PivotAggsConfig } from '../../../../common';
import { PivotConfigurationContext } from '../pivot_configuration/pivot_configuration';
import { MAX_NESTING_SUB_AGGS } from '../../../../common/pivot_aggs';
import type { DropDownOptionWithField } from '../step_define/common/get_pivot_dropdown_options';
import type { DropDownOption } from '../../../../common/dropdown';

/**
 * Component for managing sub-aggregation of the provided
 * aggregation item.
 */
export const SubAggsSection: FC<{ item: PivotAggsConfig }> = ({ item }) => {
  const { state, actions } = useContext(PivotConfigurationContext)!;

  const addSubAggHandler = useCallback(
    (d: EuiComboBoxOptionOption[]) => {
      actions.addSubAggregation(item, d);
    },
    [actions, item]
  );

  const updateSubAggHandler = useCallback(
    (prevSubItemName: string, subItem: PivotAggsConfig) => {
      actions.updateSubAggregation(prevSubItemName, subItem);
    },
    [actions]
  );

  const deleteSubAggHandler = useCallback(
    (subAggName: string) => {
      actions.deleteSubAggregation(item, subAggName);
    },
    [actions, item]
  );

  const isNewSubAggAllowed: boolean = useMemo(() => {
    let nestingLevel = 1;
    let parentItem = item.parentAgg;
    while (parentItem !== undefined) {
      nestingLevel++;
      parentItem = parentItem.parentAgg;
    }
    return nestingLevel <= MAX_NESTING_SUB_AGGS;
  }, [item]);
  const { handleFieldStatsButtonClick, populatedFields } = useFieldStatsTrigger();

  const options = useMemo(() => {
    const opts: EuiComboBoxOptionOption[] = [];
    state.aggOptions.forEach(({ label, field, options: aggOptions }: DropDownOptionWithField) => {
      const isEmpty = populatedFields && field.id ? !populatedFields.has(field.id) : false;

      const aggOption: DropDownOption = {
        isGroupLabel: true,
        key: field.id,
        searchableLabel: label,
        // @ts-ignore Purposefully passing label as element instead of string
        // for more robust rendering
        label: (
          <FieldStatsInfoButton
            isEmpty={populatedFields && !populatedFields.has(field.id)}
            field={field}
            label={label}
            onButtonClick={handleFieldStatsButtonClick}
          />
        ),
      };

      if (aggOptions.length) {
        opts.push(aggOption);
        opts.push(
          ...aggOptions.map((o) => ({
            ...o,
            isEmpty,
            isGroupLabel: false,
            searchableLabel: o.label,
          }))
        );
      }
    });
    return opts;
  }, [handleFieldStatsButtonClick, populatedFields, state.aggOptions]);
  const dropdown = (
    <DropDown
      changeHandler={addSubAggHandler}
      options={options}
      placeholder={i18n.translate('xpack.transform.stepDefineForm.addSubAggregationPlaceholder', {
        defaultMessage: 'Add a sub-aggregation ...',
      })}
      testSubj="transformSubAggregationSelection"
      isDisabled={!isNewSubAggAllowed}
    />
  );

  return (
    <>
      <EuiSpacer size="m" />
      {item.subAggs && (
        <AggListForm
          onChange={updateSubAggHandler}
          deleteHandler={deleteSubAggHandler}
          list={item.subAggs}
          options={state.aggOptionsData}
        />
      )}
      {isNewSubAggAllowed ? (
        dropdown
      ) : (
        <EuiToolTip
          anchorClassName="eui-displayBlock"
          content={
            <FormattedMessage
              id="xpack.transform.stepDefineForm.maxSubAggsLevelsLimitMessage"
              defaultMessage="You have reached the maximum number of levels of sub-aggregations that can be added in the form. Please edit the JSON config if you want to add another level."
            />
          }
        >
          {dropdown}
        </EuiToolTip>
      )}
    </>
  );
};
