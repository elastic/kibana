/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import {
  EuiComboBox,
  EuiFlexItem,
  EuiFlexGrid,
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiComboBoxOptionProps,
} from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { isAdvancedJobCreator } from '../../../../../common/job_creator';
import { Field, Aggregation } from '../../../../../../../../common/types/fields';
import { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';

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

interface Dropdown {
  title: string;
  initValue: string;
  selectedOptions: any[];
  onChange(selectedOptions: EuiComboBoxOptionProps[]): void;
  options: any[];
  testSubject: string;
}

interface ExtendedOptionProps extends EuiComboBoxOptionProps {
  agg: Aggregation | null;
  field: Field | null;
  exclude_frequent: string | null;
}

const emptyOption = {
  label: '',
  agg: null,
  field: null,
  exclude_frequent: null,
} as ExtendedOptionProps;

const excludeFrequentOptions: ExtendedOptionProps[] = [
  { label: 'all', agg: null, field: null, exclude_frequent: 'all' },
  { label: 'none', agg: null, field: null, exclude_frequent: 'none' },
];

export const CreateDetectorModal: FC<Props> = ({
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

  const [detector, setDetector] = useState(payload.detector);
  const [agg, setAgg] = useState(createAggOption(detector.agg));
  const [field, setField] = useState(createFieldOption(detector.field));
  const [byField, setByField] = useState(createFieldOption(detector.byField));
  const [overField, setOverField] = useState(createFieldOption(detector.overField));
  const [partitionField, setPartitionField] = useState(createFieldOption(detector.partitionField));
  const [excludeFrequent, setExcludeFrequent] = useState(
    createExcludeFrequentOption(detector.excludeFrequent)
  );

  const functionOptions: EuiComboBoxOptionProps[] = aggs.map(createAggOption);

  const fieldOptions: EuiComboBoxOptionProps[] = fields.map(createFieldOption);

  const onOptionChange = (func: (p: ExtendedOptionProps) => void) => (
    selectedOptions: ExtendedOptionProps[]
  ) => {
    func(selectedOptions[0] || emptyOption);
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
  }, [agg, field, byField, overField, partitionField, excludeFrequent]);

  function onCreateClick() {
    detectorChangeHandler(detector, payload.index);
  }

  const dropdowns: Dropdown[] = [
    {
      title: 'func',
      initValue: '',
      onChange: onOptionChange(setAgg),
      selectedOptions: [agg],
      options: functionOptions,
      testSubject: '',
    },
    {
      title: 'field',
      initValue: '',
      onChange: onOptionChange(setField),
      selectedOptions: [field],
      options: fieldOptions,
      testSubject: '',
    },
    {
      title: 'by',
      initValue: '',
      onChange: onOptionChange(setByField),
      selectedOptions: [byField],
      options: fieldOptions,
      testSubject: '',
    },
    {
      title: 'over',
      initValue: '',
      onChange: onOptionChange(setOverField),
      selectedOptions: [overField],
      options: fieldOptions,
      testSubject: '',
    },
    {
      title: 'partition',
      initValue: '',
      onChange: onOptionChange(setPartitionField),
      selectedOptions: [partitionField],
      options: fieldOptions,
      testSubject: '',
    },
    {
      title: 'exclude',
      initValue: '',
      onChange: onOptionChange(setExcludeFrequent),
      selectedOptions: [excludeFrequent],
      options: excludeFrequentOptions,
      testSubject: '',
    },
  ];

  return (
    <ModalWrapper onCreateClick={onCreateClick} closeModal={closeModal}>
      <EuiFlexGrid columns={3}>
        {dropdowns.map(
          ({ title, initValue, onChange, selectedOptions, options, testSubject }, i) => (
            <EuiFlexItem key={i}>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={options}
                selectedOptions={selectedOptions}
                onChange={onChange}
                isClearable={true}
                data-test-subj={testSubject}
              />
            </EuiFlexItem>
          )
        )}
      </EuiFlexGrid>
    </ModalWrapper>
  );
};

const ModalWrapper: FC<{ onCreateClick(): void; closeModal(): void }> = ({
  onCreateClick,
  closeModal,
  children,
}) => {
  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal} maxWidth={800}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Create detector</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{children}</EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal}>Cancel</EuiButtonEmpty>

          <EuiButton onClick={onCreateClick} fill>
            Save
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

function createAggOption(agg: Aggregation | null) {
  if (agg === null) {
    return emptyOption;
  } else {
    return {
      label: agg.id,
      agg,
    } as ExtendedOptionProps;
  }
}

function createFieldOption(field: Field | null) {
  if (field === null) {
    return emptyOption;
  } else {
    return {
      label: field.name,
      field,
    } as ExtendedOptionProps;
  }
}

function createExcludeFrequentOption(excludeFrequent: string | null) {
  if (excludeFrequent === null) {
    return emptyOption;
  } else {
    return {
      label: excludeFrequent,
      exclude_frequent: excludeFrequent,
    } as ExtendedOptionProps;
  }
}
