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
  requiresByField,
} from './esql_detector_functions';
import {
  byOverPartitionOptions,
  validateDetectorPartitioning,
  type EsqlPartitioningFieldKey,
} from './esql_detector_partitioning';

export interface EsqlDetectorsEditorProps {
  detectors: EsqlDetectorConfig[];
  columns: ESQLFieldWithMetadata[];
  emittedTimeField: string;
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

const partitioningFieldLabels: Record<EsqlPartitioningFieldKey, string> = {
  byField: i18n.translate('xpack.ml.esqlJob.query.byFieldLabel', { defaultMessage: 'By field' }),
  overField: i18n.translate('xpack.ml.esqlJob.query.overFieldLabel', {
    defaultMessage: 'Over field',
  }),
  partitionField: i18n.translate('xpack.ml.esqlJob.query.partitionFieldLabel', {
    defaultMessage: 'Partition field',
  }),
};

/**
 * Editor for `EsqlQueryStepState.detectors`: rows of
 * {function, field, byField, overField, partitionField} with add/remove.
 * Standalone (props-in, onChange-out) so it is reusable by the staged
 * PICK_FIELDS wizard step (g2sz.10).
 */
export const EsqlDetectorsEditor = ({
  detectors,
  columns,
  emittedTimeField,
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
            emittedTimeField={emittedTimeField}
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
  emittedTimeField,
  isDisabled,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  detector: EsqlDetectorConfig;
  columns: ESQLFieldWithMetadata[];
  emittedTimeField: string;
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
  const partitioningOptions = useMemo(
    () => byOverPartitionOptions(columns, emittedTimeField),
    [columns, emittedTimeField]
  );
  const partitioningErrors = useMemo(
    () => validateDetectorPartitioning(detector, columns, emittedTimeField),
    [detector, columns, emittedTimeField]
  );
  const summary = describeDetector({ functionName: detector.function, field: detector.field });
  const needsByField = requiresByField(detector.function);

  const partitioningField = (key: EsqlPartitioningFieldKey) => {
    const value = detector[key];
    const selected = partitioningOptions.filter(({ label }) => label === value);
    const error = partitioningErrors[key];
    const isInvalid = error !== undefined;

    return (
      <EuiFlexItem key={key}>
        <EuiFormRow
          label={partitioningFieldLabels[key]}
          isInvalid={isInvalid}
          error={partitioningErrorMessage(error, key)}
          fullWidth
        >
          <EuiComboBox
            aria-label={i18n.translate('xpack.ml.esqlJob.query.partitioningFieldAriaLabel', {
              defaultMessage: 'Detector {index} {fieldLabel}',
              values: { index: index + 1, fieldLabel: partitioningFieldLabels[key] },
            })}
            singleSelection
            isClearable
            isInvalid={isInvalid}
            options={partitioningOptions}
            selectedOptions={selected}
            onChange={(options) => onChange({ ...detector, [key]: options[0]?.label })}
            isDisabled={isDisabled}
            data-test-subj={`mlEsqlDetector${capitalize(key)}-${index}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
    );
  };

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
      {needsByField ? (
        <EuiText
          size="xs"
          color={detector.byField ? 'subdued' : 'danger'}
          data-test-subj={`mlEsqlDetectorByFieldHint-${index}`}
        >
          {i18n.translate('xpack.ml.esqlJob.query.rareRequiresByFieldHint', {
            defaultMessage: '{functionName} requires a by field.',
            values: { functionName: detector.function },
          })}
        </EuiText>
      ) : null}
      <EuiFlexGroup gutterSize="s" data-test-subj={`mlEsqlDetectorPartitioningRow-${index}`}>
        {(['byField', 'overField', 'partitionField'] as const).map(partitioningField)}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </React.Fragment>
  );
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const partitioningErrorMessage = (
  error: ReturnType<typeof validateDetectorPartitioning>[EsqlPartitioningFieldKey],
  key: EsqlPartitioningFieldKey
): string | undefined => {
  switch (error) {
    case 'byFieldRequiredForFunction':
      return i18n.translate('xpack.ml.esqlJob.query.byFieldRequiredError', {
        defaultMessage: 'Required for rare/freq_rare detectors.',
      });
    case 'duplicateField':
      return i18n.translate('xpack.ml.esqlJob.query.partitioningDuplicateFieldError', {
        defaultMessage: 'A field can only be used once per detector.',
      });
    case 'unknownField':
      return i18n.translate('xpack.ml.esqlJob.query.partitioningUnknownFieldError', {
        defaultMessage: 'This column is no longer part of the query output.',
      });
    case 'timeColumnUsed':
      return i18n.translate('xpack.ml.esqlJob.query.partitioningTimeColumnError', {
        defaultMessage: 'The emitted time column cannot be used here.',
      });
    default:
      return undefined;
  }
};
