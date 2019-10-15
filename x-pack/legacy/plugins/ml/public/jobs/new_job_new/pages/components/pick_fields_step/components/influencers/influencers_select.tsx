/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { Field, EVENT_RATE_FIELD_ID } from '../../../../../../../../common/types/fields';
import { MLCATEGORY } from '../../../../../../../../common/constants/field_types';

interface Props {
  fields: Field[];
  changeHandler(i: string[]): void;
  selectedInfluencers: string[];
}

export const InfluencersSelect: FC<Props> = ({ fields, changeHandler, selectedInfluencers }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const options: EuiComboBoxOptionProps[] = fields
    .filter(f => f.id !== EVENT_RATE_FIELD_ID)
    .map(f => ({
      label: f.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (jobCreator.categorizationFieldName !== null) {
    options.push({
      label: MLCATEGORY,
    });
  }

  const selection: EuiComboBoxOptionProps[] = selectedInfluencers.map(i => ({ label: i }));

  function onChange(selectedOptions: EuiComboBoxOptionProps[]) {
    changeHandler(selectedOptions.map(o => o.label));
  }

  return (
    <EuiComboBox
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
      data-test-subj="mlInfluencerSelect"
    />
  );
};
