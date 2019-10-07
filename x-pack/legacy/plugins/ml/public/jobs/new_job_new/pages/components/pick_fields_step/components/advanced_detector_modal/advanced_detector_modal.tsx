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
import {
  AdvancedJobCreator,
  isAdvancedJobCreator,
  JobCreatorType,
} from '../../../../../common/job_creator';
import {
  Field,
  Aggregation,
  EVENT_RATE_FIELD_ID,
} from '../../../../../../../../common/types/fields';
import { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
import { ES_FIELD_TYPES } from '../../../../../../../../../../../../src/plugins/data/public';
import { ModalWrapper } from './modal_wrapper';
import {
  ML_JOB_AGGREGATION,
  ES_AGGREGATION,
} from '../../../../../../../../common/constants/aggregation_types';
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

interface ExtendedOptionProps extends EuiComboBoxOptionProps {
  agg: Aggregation | null;
  field: Field | null;
  exclude_frequent: string | null;
}

const emptyOption: ExtendedOptionProps = {
  label: '',
  agg: null,
  field: null,
  exclude_frequent: null,
};

const excludeFrequentOptions: ExtendedOptionProps[] = [
  { label: 'all', agg: null, field: null, exclude_frequent: 'all' },
  { label: 'none', agg: null, field: null, exclude_frequent: 'none' },
];

export const AdvancedDetectorModal: FC<Props> = ({
  payload,
  fields,
  aggs,
  detectorChangeHandler,
  closeModal,
}) => {
  const { jobCreator: jc } = useContext(JobCreatorContext);

  if (isAdvancedJobCreator(jc) === false) {
    return null;
  }

  const jobCreator = jc as AdvancedJobCreator;

  const [detector, setDetector] = useState(payload.detector);
  const [agg, setAgg] = useState(createAggOption(detector.agg));
  const [field, setField] = useState(createFieldOption(detector.field));
  const [byField, setByField] = useState(createFieldOption(detector.byField));
  const [overField, setOverField] = useState(createFieldOption(detector.overField));
  const [partitionField, setPartitionField] = useState(createFieldOption(detector.partitionField));
  const [excludeFrequent, setExcludeFrequent] = useState(
    createExcludeFrequentOption(detector.excludeFrequent)
  );
  const [fieldsEnabled, setFieldsEnabled] = useState(true);

  const aggOptions: EuiComboBoxOptionProps[] = aggs.map(createAggOption);
  const fieldOptions: EuiComboBoxOptionProps[] = fields.map(createFieldOption);
  const splitFieldOptions = [...fieldOptions, ...createMlcategoryField(jobCreator)];

  const onOptionChange = (func: (p: ExtendedOptionProps) => any) => (
    selectedOptions: EuiComboBoxOptionProps[]
  ) => {
    func((selectedOptions[0] || emptyOption) as ExtendedOptionProps);
  };

  useEffect(() => {
    const dtr: RichDetector = {
      agg: agg.agg,
      field: field.field,
      byField: byField.field,
      overField: overField.field,
      partitionField: partitionField.field,
      excludeFrequent: excludeFrequent.exclude_frequent,
    };
    setDetector(dtr);

    if (agg.agg !== null) {
      setFieldsEnabled(true);
      if (agg.agg.id === ML_JOB_AGGREGATION.COUNT) {
        const eventRateField = (fieldOptions as ExtendedOptionProps[]).find(f => {
          if (f.field !== null) {
            return f.field.id === EVENT_RATE_FIELD_ID;
          }
        });
        if (eventRateField !== undefined) {
          setField(eventRateField);
        }
      }
    }
  }, [agg, field, byField, overField, partitionField, excludeFrequent]);

  function onCreateClick() {
    detectorChangeHandler(detector, payload.index);
  }

  return (
    <ModalWrapper onCreateClick={onCreateClick} closeModal={closeModal} saveEnabled={fieldsEnabled}>
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <AggDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={aggOptions}
                selectedOptions={[agg]}
                onChange={onOptionChange(setAgg)}
                isClearable={true}
                // data-test-subj={testSubject}
              />
            </AggDescription>
          </EuiFlexItem>
          <EuiFlexItem>
            <FieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={fieldOptions}
                selectedOptions={[field]}
                onChange={onOptionChange(setField)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
                // data-test-subj={testSubject}
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
                selectedOptions={[byField]}
                onChange={onOptionChange(setByField)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
                // data-test-subj={testSubject}
              />
            </ByFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem>
            <OverFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={[overField]}
                onChange={onOptionChange(setOverField)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
                // data-test-subj={testSubject}
              />
            </OverFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem>
            <PartitionFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={[partitionField]}
                onChange={onOptionChange(setPartitionField)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
                // data-test-subj={testSubject}
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
                selectedOptions={[excludeFrequent]}
                onChange={onOptionChange(setExcludeFrequent)}
                isClearable={true}
                isDisabled={fieldsEnabled === false}
                // data-test-subj={testSubject}
              />
            </ExcludeFrequentDescription>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </Fragment>
    </ModalWrapper>
  );
};

function createAggOption(agg: Aggregation | null) {
  if (agg === null) {
    return emptyOption;
  }
  return {
    label: agg.id,
    agg,
  } as ExtendedOptionProps;
}

function createFieldOption(field: Field | null) {
  if (field === null) {
    return emptyOption;
  }
  return {
    label: field.name,
    field,
  } as ExtendedOptionProps;
}

function createExcludeFrequentOption(excludeFrequent: string | null) {
  if (excludeFrequent === null) {
    return emptyOption;
  }
  return {
    label: excludeFrequent,
    exclude_frequent: excludeFrequent,
  } as ExtendedOptionProps;
}

function createMlcategoryField(jobCreator: JobCreatorType) {
  if (jobCreator.categorizationFieldName === null) {
    return [];
  }
  const mlCategory: Field = {
    id: 'mlcategory',
    name: 'mlcategory',
    type: ES_FIELD_TYPES.KEYWORD,
    aggregatable: false,
  };
  return [
    {
      label: 'mlcategory',
      field: mlCategory,
    } as ExtendedOptionProps,
  ];
}
