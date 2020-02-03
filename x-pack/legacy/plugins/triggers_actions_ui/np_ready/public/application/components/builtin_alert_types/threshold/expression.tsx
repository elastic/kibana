/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFormRow,
  EuiCallOut,
} from '@elastic/eui';
import { AlertTypeModel, ValidationResult } from '../../../../types';
import { COMPARATORS, buildinGroupByTypes, buildinComparators } from '../../../../common/constants';
import {
  getMatchingIndicesForThresholdAlertType,
  getThresholdAlertTypeFields,
  loadIndexPatterns,
} from './lib/api';
import { useAppDependencies } from '../../../app_context';
import { getTimeFieldOptions } from '../../../../common/lib/get_time_options';
import { ThresholdVisualization } from './visualization';
import { WhenExpression } from '../../../../common';
import {
  OfExpression,
  ThresholdExpression,
  ForLastExpression,
  GroupByExpression,
} from '../../../../common';
import { buildInAggregationTypes } from '../../../../common/constants';
import { IndexThresholdAlertParams } from '../types';

const DEFAULT_VALUES = {
  AGGREGATION_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  TRIGGER_INTERVAL_SIZE: 1,
  TRIGGER_INTERVAL_UNIT: 'm',
  THRESHOLD: [1000, 5000],
  GROUP_BY: 'all',
};

const expressionFieldsWithValidation = [
  'index',
  'timeField',
  'aggField',
  'termSize',
  'termField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

const validateAlertType = (alertParams: IndexThresholdAlertParams): ValidationResult => {
  const {
    index,
    timeField,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    threshold,
    timeWindowSize,
  } = alertParams;
  const validationResult = { errors: {} };
  const errors = {
    aggField: new Array<string>(),
    termSize: new Array<string>(),
    termField: new Array<string>(),
    timeWindowSize: new Array<string>(),
    threshold0: new Array<string>(),
    threshold1: new Array<string>(),
    index: new Array<string>(),
    timeField: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!index) {
    errors.index.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredIndexText', {
        defaultMessage: 'Index is required.',
      })
    );
  }
  if (!timeField) {
    errors.timeField.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredTimeFieldText', {
        defaultMessage: 'Time field is required.',
      })
    );
  }
  if (aggType && buildInAggregationTypes[aggType].fieldRequired && !aggField) {
    errors.aggField.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredAggFieldText', {
        defaultMessage: 'Aggregation field is required.',
      })
    );
  }
  if (!termSize) {
    errors.termSize.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredTermSizedText', {
        defaultMessage: 'Term size is required.',
      })
    );
  }
  if (groupBy && buildinGroupByTypes[groupBy].sizeRequired && !termField) {
    errors.termField.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredtTermFieldText', {
        defaultMessage: 'Term field is required.',
      })
    );
  }
  if (!timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }
  if (threshold && threshold.length > 0 && !threshold[0]) {
    errors.threshold0.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredThreshold0Text', {
        defaultMessage: 'Threshold0, is required.',
      })
    );
  }
  if (threshold && threshold.length > 1 && !threshold[1]) {
    errors.threshold1.push(
      i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredThreshold1Text', {
        defaultMessage: 'Threshold1 is required.',
      })
    );
  }
  return validationResult;
};

export function getActionType(): AlertTypeModel {
  return {
    id: 'threshold',
    name: 'Index Threshold',
    iconClass: 'alert',
    alertParamsExpression: IndexThresholdAlertTypeExpression,
    validate: validateAlertType,
  };
}

interface IndexThresholdProps {
  alertParams: IndexThresholdAlertParams;
  setAlertParams: (property: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  errors: { [key: string]: string[] };
}

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<IndexThresholdProps> = ({
  alertParams,
  setAlertParams,
  setAlertProperty,
  errors,
}) => {
  const { http } = useAppDependencies();

  const {
    index,
    timeField,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
  } = alertParams;

  const firstFieldOption = {
    text: i18n.translate(
      'xpack.triggersActionsUI.sections.alertAdd.threshold.timeFieldOptionLabel',
      {
        defaultMessage: 'Select a field',
      }
    ),
    value: '',
  };

  const [indexPopoverOpen, setIndexPopoverOpen] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [esFields, setEsFields] = useState<Record<string, any>>([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const hasExpressionErrors = !!Object.keys(errors).find(
    errorKey => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  );

  const getIndexPatterns = async () => {
    const indexPatternObjects = await loadIndexPatterns();
    const titles = indexPatternObjects.map((indexPattern: any) => indexPattern.attributes.title);
    setIndexPatterns(titles);
  };

  const expressionErrorMessage = i18n.translate(
    'xpack.triggersActionsUI.sections.alertAdd.threshold.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = () => {
    setAlertProperty('params', {
      aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
      termSize: DEFAULT_VALUES.TERM_SIZE,
      thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: DEFAULT_VALUES.TIME_WINDOW_UNIT,
      triggerIntervalUnit: DEFAULT_VALUES.TRIGGER_INTERVAL_UNIT,
      groupBy: DEFAULT_VALUES.GROUP_BY,
      threshold: DEFAULT_VALUES.THRESHOLD,
    });
  };

  const getFields = async (indexes: string[]) => {
    return await getThresholdAlertTypeFields({ indexes, http });
  };

  useEffect(() => {
    getIndexPatterns();
  }, []);

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  interface IOption {
    label: string;
    options: Array<{ value: string; label: string }>;
  }

  const getIndexOptions = async (pattern: string, indexPatternsParam: string[]) => {
    const options: IOption[] = [];

    if (!pattern) {
      return options;
    }

    const matchingIndices = (await getMatchingIndicesForThresholdAlertType({
      pattern,
      http,
    })) as string[];
    const matchingIndexPatterns = indexPatternsParam.filter(anIndexPattern => {
      return anIndexPattern.includes(pattern);
    }) as string[];

    if (matchingIndices.length || matchingIndexPatterns.length) {
      const matchingOptions = _.uniq([...matchingIndices, ...matchingIndexPatterns]);

      options.push({
        label: i18n.translate(
          'xpack.triggersActionsUI.sections.alertAdd.threshold.indicesAndIndexPatternsLabel',
          {
            defaultMessage: 'Based on your indices and index patterns',
          }
        ),
        options: matchingOptions.map(match => {
          return {
            label: match,
            value: match,
          };
        }),
      });
    }

    options.push({
      label: i18n.translate('xpack.triggersActionsUI.sections.alertAdd.threshold.chooseLabel', {
        defaultMessage: 'Choose…',
      }),
      options: [
        {
          value: pattern,
          label: pattern,
        },
      ],
    });

    return options;
  };

  const indexPopover = (
    <Fragment>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="indexSelectSearchBox"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertAdd.threshold.indicesToQueryLabel"
                defaultMessage="Indices to query"
              />
            }
            isInvalid={errors.index.length > 0 && index !== undefined}
            error={errors.index}
            helpText={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertAdd.threshold.howToBroadenSearchQueryDescription"
                defaultMessage="Use * to broaden your query."
              />
            }
          >
            <EuiComboBox
              fullWidth
              async
              isLoading={isIndiciesLoading}
              isInvalid={errors.index.length > 0 && index !== undefined}
              noSuggestions={!indexOptions.length}
              options={indexOptions}
              data-test-subj="thresholdIndexesComboBox"
              selectedOptions={(index || []).map((anIndex: string) => {
                return {
                  label: anIndex,
                  value: anIndex,
                };
              })}
              onChange={async (selected: EuiComboBoxOptionProps[]) => {
                setAlertParams(
                  'index',
                  selected.map(aSelected => aSelected.value)
                );
                const indices = selected.map(s => s.value as string);

                // reset time field and expression fields if indices are deleted
                if (indices.length === 0) {
                  setTimeFieldOptions([firstFieldOption]);
                  setAlertParams('timeFields', []);

                  setDefaultExpressionValues();
                  return;
                }
                const currentEsFields = await getFields(indices);
                const timeFields = getTimeFieldOptions(currentEsFields as any);

                setEsFields(currentEsFields);
                setAlertParams('timeFields', timeFields);
                setTimeFieldOptions([firstFieldOption, ...timeFields]);
              }}
              onSearchChange={async search => {
                setIsIndiciesLoading(true);
                setIndexOptions(await getIndexOptions(search, indexPatterns));
                setIsIndiciesLoading(false);
              }}
              onBlur={() => {
                if (!index) {
                  setAlertParams('index', []);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="timeField"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertAdd.threshold.timeFieldLabel"
                defaultMessage="Time field"
              />
            }
            isInvalid={errors.timeField.length > 0 && timeField !== undefined}
            error={errors.timeField}
          >
            <EuiSelect
              options={timeFieldOptions}
              isInvalid={errors.timeField.length > 0 && timeField !== undefined}
              fullWidth
              name="watchTimeField"
              data-test-subj="watchTimeFieldSelect"
              value={timeField}
              onChange={e => {
                setAlertParams('timeField', e.target.value);
              }}
              onBlur={() => {
                if (timeField === undefined) {
                  setAlertParams('timeField', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );

  return (
    <Fragment>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      ) : null}
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="indexPopover"
            button={
              <EuiExpression
                description={i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.threshold.indexLabel',
                  {
                    defaultMessage: 'index',
                  }
                )}
                value={index || firstFieldOption.text}
                isActive={indexPopoverOpen}
                onClick={() => {
                  setIndexPopoverOpen(true);
                }}
                color={index ? 'secondary' : 'danger'}
              />
            }
            isOpen={indexPopoverOpen}
            closePopover={() => {
              setIndexPopoverOpen(false);
            }}
            ownFocus
            withTitle
            anchorPosition="downLeft"
            zIndex={8000}
          >
            <div style={{ width: '450px' }}>
              <EuiPopoverTitle>
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.alertAdd.threshold.indexButtonLabel',
                  {
                    defaultMessage: 'index',
                  }
                )}
              </EuiPopoverTitle>
              {indexPopover}
            </div>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <WhenExpression
            aggType={aggType}
            defaultAggType={DEFAULT_VALUES.AGGREGATION_TYPE}
            onChangeSelectedAggType={(selectedAggType: string) =>
              setAlertParams('aggType', selectedAggType)
            }
          />
        </EuiFlexItem>
        {aggType && buildInAggregationTypes[aggType].fieldRequired ? (
          <EuiFlexItem grow={false}>
            <OfExpression
              aggField={aggField}
              fields={esFields}
              aggType={aggType}
              errors={errors}
              onChangeSelectedAggField={(selectedAggField?: string) =>
                setAlertParams('aggField', selectedAggField)
              }
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <GroupByExpression
            groupBy={groupBy}
            termField={termField}
            termSize={termSize}
            defaultGroupBy={DEFAULT_VALUES.GROUP_BY}
            errors={errors}
            fields={esFields}
            onChangeSelectedGroupBy={selectedGroupBy => setAlertParams('groupBy', selectedGroupBy)}
            onChangeSelectedTermField={selectedTermField =>
              setAlertParams('termField', selectedTermField)
            }
            onChangeSelectedTermSize={selectedTermSize =>
              setAlertParams('termSize', selectedTermSize)
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ThresholdExpression
            thresholdComparator={thresholdComparator}
            threshold={threshold}
            defaultThresholdComparator={DEFAULT_VALUES.THRESHOLD_COMPARATOR}
            errors={errors}
            onChangeSelectedThreshold={selectedThresholds =>
              setAlertParams('threshold', selectedThresholds)
            }
            onChangeSelectedThresholdComparator={selectedThresholdComparator =>
              setAlertParams('thresholdComparator', selectedThresholdComparator)
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ForLastExpression
            timeWindowSize={timeWindowSize || 1}
            timeWindowUnit={timeWindowUnit || ''}
            errors={errors}
            onChangeWindowSize={(selectedWindowSize: any) =>
              setAlertParams('timeWindowSize', selectedWindowSize)
            }
            onChangeWindowUnit={(selectedWindowUnit: any) =>
              setAlertParams('timeWindowUnit', selectedWindowUnit)
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasExpressionErrors ? null : (
        <Fragment>
          <ThresholdVisualization
            alertParams={alertParams}
            aggregationTypes={buildInAggregationTypes}
            comparators={buildinComparators}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
