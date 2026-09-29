/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';
import { NUMERIC_ESQL_TYPES } from './esql_numeric_types';
import {
  DEFAULT_DETECTOR_FUNCTION,
  describeDetector,
  detectorFieldRequirement,
  detectorFunctionSelectOptions,
} from './esql_detector_functions';

export interface EsqlDetectorsEditorProps {
  detectors: EsqlDetectorConfig[];
  columns: ESQLFieldWithMetadata[];
  onChange: (detectors: EsqlDetectorConfig[]) => void;
  isDisabled?: boolean;
}

const fieldOptionsFor = (
  columns: ESQLFieldWithMetadata[],
  functionName: string
): EuiComboBoxOptionOption[] => {
  const requirement = detectorFieldRequirement(functionName);

  if (requirement === 'none') return [];

  return columns
    .filter(({ type }) => requirement === 'any' || NUMERIC_ESQL_TYPES.has(type))
    .map(({ name, type }) => ({ label: name, append: type }));
};

/**
 * Editor for `EsqlQueryStepState.detectors`: rows of {function, field} with
 * add/remove. Standalone (props-in, onChange-out) so it can be reused by the
 * staged PICK_FIELDS wizard step (g2sz.10), which will add byField/overField/
 * partitionField UI on top of the same `EsqlDetectorConfig` rows.
 */
export const EsqlDetectorsEditor = ({
  detectors,
  columns,
  onChange,
  isDisabled,
}: EsqlDetectorsEditorProps) => {
  const updateDetector = (index: number, next: EsqlDetectorConfig) =>
    onChange(detectors.map((detector, i) => (i === index ? next : detector)));

  const removeDetector = (index: number) => onChange(detectors.filter((_, i) => i !== index));

  const addDetector = () => onChange([...detectors, { function: DEFAULT_DETECTOR_FUNCTION }]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.ml.esqlJob.query.detectorsLabel', {
        defaultMessage: 'Detectors',
      })}
      fullWidth
    >
      <div data-test-subj="mlEsqlDetectors">
        {detectors.map((detector, index) => (
          <DetectorRow
            key={index}
            index={index}
            detector={detector}
            columns={columns}
            isDisabled={isDisabled}
            canRemove={detectors.length > 1}
            onChange={(next) => updateDetector(index, next)}
            onRemove={() => removeDetector(index)}
          />
        ))}
        <EuiButtonEmpty
          size="s"
          iconType="plusInCircle"
          onClick={addDetector}
          isDisabled={isDisabled}
          data-test-subj="mlEsqlAddDetectorButton"
        >
          {i18n.translate('xpack.ml.esqlJob.query.addDetectorButtonLabel', {
            defaultMessage: 'Add detector',
          })}
        </EuiButtonEmpty>
      </div>
    </EuiFormRow>
  );
};

const DetectorRow = ({
  index,
  detector,
  columns,
  isDisabled,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  detector: EsqlDetectorConfig;
  columns: ESQLFieldWithMetadata[];
  isDisabled?: boolean;
  canRemove: boolean;
  onChange: (next: EsqlDetectorConfig) => void;
  onRemove: () => void;
}) => {
  const fieldRequirement = detectorFieldRequirement(detector.function);
  const fieldOptions = useMemo(
    () => fieldOptionsFor(columns, detector.function),
    [columns, detector.function]
  );
  const selectedField = useMemo(
    () => fieldOptions.filter(({ label }) => label === detector.field),
    [fieldOptions, detector.field]
  );
  const summary = describeDetector({ functionName: detector.function, field: detector.field });

  return (
    <React.Fragment>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        data-test-subj={`mlEsqlDetectorRow-${index}`}
      >
        <EuiFlexItem grow={false}>
          <EuiSelect
            aria-label={i18n.translate('xpack.ml.esqlJob.query.detectorFunctionAriaLabel', {
              defaultMessage: 'Detector {index} function',
              values: { index: index + 1 },
            })}
            options={detectorFunctionSelectOptions}
            value={detector.function}
            onChange={(event) =>
              onChange({
                ...detector,
                function: event.target.value,
                field:
                  detectorFieldRequirement(event.target.value) === 'none'
                    ? undefined
                    : detector.field,
              })
            }
            disabled={isDisabled}
            data-test-subj={`mlEsqlDetectorFunction-${index}`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {fieldRequirement === 'none' ? null : (
            <EuiComboBox
              aria-label={i18n.translate('xpack.ml.esqlJob.query.detectorFieldAriaLabel', {
                defaultMessage: 'Detector {index} field',
                values: { index: index + 1 },
              })}
              singleSelection
              options={fieldOptions}
              selectedOptions={selectedField}
              onChange={(options) => onChange({ ...detector, field: options[0]?.label })}
              isDisabled={isDisabled}
              data-test-subj={`mlEsqlDetectorField-${index}`}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj={`mlEsqlDetectorSummary-${index}`}>
            {summary}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.ml.esqlJob.query.removeDetectorAriaLabel', {
              defaultMessage: 'Remove detector {index}',
              values: { index: index + 1 },
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={i18n.translate('xpack.ml.esqlJob.query.removeDetectorAriaLabel', {
                defaultMessage: 'Remove detector {index}',
                values: { index: index + 1 },
              })}
              onClick={onRemove}
              isDisabled={isDisabled || !canRemove}
              data-test-subj={`mlEsqlRemoveDetectorButton-${index}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </React.Fragment>
  );
};
