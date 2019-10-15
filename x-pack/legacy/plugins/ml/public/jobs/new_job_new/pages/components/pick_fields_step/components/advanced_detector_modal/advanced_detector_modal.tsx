/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useContext, useEffect } from 'react';
import {
  EuiComboBox,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiComboBoxOptionProps,
  EuiHorizontalRule,
} from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator, JobCreatorType } from '../../../../../common/job_creator';
import {
  Field,
  Aggregation,
  EVENT_RATE_FIELD_ID,
} from '../../../../../../../../common/types/fields';
import { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
import { ES_FIELD_TYPES } from '../../../../../../../../../../../../src/plugins/data/public';
import { ModalWrapper } from './modal_wrapper';
import { MLCATEGORY } from '../../../../../../../../common/constants/field_types';

import {
  AggDescription,
  FieldDescription,
  ByFieldDescription,
  OverFieldDescription,
  PartitionFieldDescription,
  ExcludeFrequentDescription,
} from './descriptions';

interface Props {
  payload: ModalPayload;
  fields: Field[];
  aggs: Aggregation[];
  detectorChangeHandler: (dtr: RichDetector, index?: number) => void;
  closeModal(): void;
}

export interface ModalPayload {
  detector: RichDetector;
  index?: number;
}

const emptyOption: EuiComboBoxOptionProps = {
  label: '',
};

const mlCategory: Field = {
  id: MLCATEGORY,
  name: MLCATEGORY,
  type: ES_FIELD_TYPES.KEYWORD,
  aggregatable: false,
};

const excludeFrequentOptions: EuiComboBoxOptionProps[] = [{ label: 'all' }, { label: 'none' }];

export const AdvancedDetectorModal: FC<Props> = ({
  payload,
  fields,
  aggs,
  detectorChangeHandler,
  closeModal,
}) => {
  const { jobCreator: jc } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;

  const [detector, setDetector] = useState(payload.detector);
  const [aggOption, setAggOption] = useState(createAggOption(detector.agg));
  const [fieldOption, setFieldOption] = useState(createFieldOption(detector.field));
  const [byFieldOption, setByFieldOption] = useState(createFieldOption(detector.byField));
  const [overFieldOption, setOverFieldOption] = useState(createFieldOption(detector.overField));
  const [partitionFieldOption, setPartitionFieldOption] = useState(
    createFieldOption(detector.partitionField)
  );
  const [excludeFrequentOption, setExcludeFrequentOption] = useState(
    createExcludeFrequentOption(detector.excludeFrequent)
  );
  const [fieldsEnabled, setFieldsEnabled] = useState(true);
  const [fieldOptionEnabled, setFieldOptionEnabled] = useState(true);

  const aggOptions: EuiComboBoxOptionProps[] = aggs.map(createAggOption);
  const fieldOptions: EuiComboBoxOptionProps[] = fields
    .filter(f => f.id !== EVENT_RATE_FIELD_ID)
    .map(createFieldOption);
  const splitFieldOptions = [...fieldOptions, ...createMlcategoryField(jobCreator)];

  const eventRateField = fields.find(f => f.id === EVENT_RATE_FIELD_ID);

  const onOptionChange = (func: (p: EuiComboBoxOptionProps) => any) => (
    selectedOptions: EuiComboBoxOptionProps[]
  ) => {
    func(selectedOptions[0] || emptyOption);
  };

  function getAgg(title: string) {
    return aggs.find(a => a.id === title) || null;
  }
  function getField(title: string) {
    if (title === mlCategory.id) {
      return mlCategory;
    }
    return fields.find(a => a.id === title) || null;
  }

  useEffect(() => {
    const agg = getAgg(aggOption.label);
    let field = getField(fieldOption.label);

    if (agg !== null) {
      setFieldsEnabled(true);
      if (isFieldlessAgg(agg) && eventRateField !== undefined) {
        setFieldOption(emptyOption);
        setFieldOptionEnabled(false);
        field = eventRateField;
      } else {
        setFieldOptionEnabled(true);
      }
    } else {
      setFieldsEnabled(false);
    }

    const dtr: RichDetector = {
      agg,
      field,
      byField: getField(byFieldOption.label),
      overField: getField(overFieldOption.label),
      partitionField: getField(partitionFieldOption.label),
      excludeFrequent: excludeFrequentOption.label !== '' ? excludeFrequentOption.label : null,
    };
    setDetector(dtr);
  }, [
    aggOption,
    fieldOption,
    byFieldOption,
    overFieldOption,
    partitionFieldOption,
    excludeFrequentOption,
  ]);

  useEffect(() => {
    const agg = getAgg(aggOption.label);
    setFieldsEnabled(aggOption.label !== '');
    if (agg !== null) {
      setFieldOptionEnabled(isFieldlessAgg(agg) === false);
    }
  }, []);

  function onCreateClick() {
    detectorChangeHandler(detector, payload.index);
  }

  function saveEnabled() {
    return (
      fieldsEnabled &&
      (fieldOptionEnabled === false || (fieldOptionEnabled === true && fieldOption.label !== ''))
    );
  }

  return (
    <ModalWrapper onCreateClick={onCreateClick} closeModal={closeModal} saveEnabled={saveEnabled()}>
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <AggDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={aggOptions}
                selectedOptions={[aggOption]}
                onChange={onOptionChange(setAggOption)}
                isClearable={true}
              />
            </AggDescription>
          </EuiFlexItem>
          <EuiFlexItem>
            <FieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={fieldOptions}
                selectedOptions={[fieldOption]}
                onChange={onOptionChange(setFieldOption)}
                isClearable={true}
                isDisabled={fieldsEnabled === false || fieldOptionEnabled === false}
              />
            </FieldDescription>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="l" />
        <EuiFlexGrid columns={2}>
          <EuiFlexItem>
            <ByFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={[byFieldOption]}
                onChange={onOptionChange(setByFieldOption)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
              />
            </ByFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem>
            <OverFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={[overFieldOption]}
                onChange={onOptionChange(setOverFieldOption)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
              />
            </OverFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem>
            <PartitionFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={[partitionFieldOption]}
                onChange={onOptionChange(setPartitionFieldOption)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
              />
            </PartitionFieldDescription>
          </EuiFlexItem>
        </EuiFlexGrid>
        <EuiHorizontalRule margin="l" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <ExcludeFrequentDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={excludeFrequentOptions}
                selectedOptions={[excludeFrequentOption]}
                onChange={onOptionChange(setExcludeFrequentOption)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
              />
            </ExcludeFrequentDescription>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </Fragment>
    </ModalWrapper>
  );
};

function createAggOption(agg: Aggregation | null): EuiComboBoxOptionProps {
  if (agg === null) {
    return emptyOption;
  }
  return {
    label: agg.id,
  };
}

function createFieldOption(field: Field | null): EuiComboBoxOptionProps {
  if (field === null) {
    return emptyOption;
  }
  return {
    label: field.name,
  };
}

function createExcludeFrequentOption(excludeFrequent: string | null): EuiComboBoxOptionProps {
  if (excludeFrequent === null) {
    return emptyOption;
  }
  return {
    label: excludeFrequent,
  };
}

function isFieldlessAgg(agg: Aggregation) {
  return agg.fields && agg.fields.length === 1 && agg.fields[0].id === EVENT_RATE_FIELD_ID;
}

function createMlcategoryField(jobCreator: JobCreatorType): EuiComboBoxOptionProps[] {
  if (jobCreator.categorizationFieldName === null) {
    return [];
  }
  return [
    {
      label: MLCATEGORY,
    },
  ];
}
