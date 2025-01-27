/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useState, useEffect, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import type { Field, AggFieldPair } from '@kbn/ml-anomaly-utils';
import { EVENT_RATE_FIELD_ID } from '@kbn/ml-anomaly-utils';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import type { DropDownLabel } from '@kbn/ml-field-stats-flyout';
import {
  OptionListWithFieldStats,
  FieldStatsInfoButton,
  useFieldStatsTrigger,
} from '@kbn/ml-field-stats-flyout';
import { JobCreatorContext } from '../../../job_creator_context';
export type { DropDownLabel };
export type DropDownProps = DropDownLabel[] | EuiComboBoxOptionOption[];

interface Props {
  fields: Field[];
  changeHandler(d: DropDownLabel[]): void;
  selectedOptions: DropDownLabel[];
  removeOptions: AggFieldPair[];
}

export const AggSelect: FC<Props> = ({ fields, changeHandler, selectedOptions, removeOptions }) => {
  const { jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.duplicateDetectors);
  // create list of labels based on already selected detectors
  // so they can be removed from the dropdown list
  const removeLabels = removeOptions.map(createLabel);
  const { handleFieldStatsButtonClick, populatedFields } = useFieldStatsTrigger();

  const options: DropDownLabel[] = useMemo(
    () => {
      const opts: DropDownLabel[] = [];
      fields.forEach((f) => {
        const isEmpty = f.id === EVENT_RATE_FIELD_ID ? false : !populatedFields?.has(f.name);
        const aggOption: DropDownLabel = {
          isGroupLabel: true,
          key: f.name,
          searchableLabel: f.name,
          isEmpty,
          // @ts-ignore Purposefully passing label as element instead of string
          // for more robust rendering
          label: (
            <FieldStatsInfoButton
              hideTrigger={f.id === EVENT_RATE_FIELD_ID}
              isEmpty={isEmpty}
              field={f}
              label={f.name}
              onButtonClick={handleFieldStatsButtonClick}
            />
          ),
        };
        if (typeof f.aggs !== 'undefined' && f.aggs.length > 0) {
          opts.push(aggOption);

          f.aggs.forEach((a) => {
            const label = `${a.title}(${f.name})`;
            if (removeLabels.includes(label) === true) return;
            if (a.dslName !== null) {
              const agg: DropDownLabel = {
                key: label,
                isEmpty,
                hideTrigger: true,
                isGroupLabel: false,
                label,
                agg: omit(a, 'fields'),
                field: omit(f, 'aggs'),
              };
              opts.push(agg);
            }
          });
        }
      });
      return opts;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleFieldStatsButtonClick, fields, removeLabels, populatedFields?.size]
  );

  useEffect(() => {
    setValidation(jobValidator.duplicateDetectors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  return (
    <EuiFormRow
      error={validation.message}
      isInvalid={validation.valid === false}
      data-test-subj="mlJobWizardAggSelection"
    >
      <OptionListWithFieldStats
        aria-label={i18n.translate('xpack.ml.newJob.wizard.aggSelect.ariaLabel', {
          defaultMessage: 'Select an aggregation',
        })}
        singleSelection={true}
        options={options}
        selectedOptions={selectedOptions}
        onChange={changeHandler}
        isClearable={false}
        isInvalid={validation.valid === false}
      />
    </EuiFormRow>
  );
};

export function createLabel(pair: AggFieldPair): string {
  return `${pair.agg.title}(${pair.field.name})`;
}
