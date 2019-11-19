/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
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
  EuiFieldNumber,
  EuiComboBoxOptionProps,
  EuiText,
} from '@elastic/eui';
import { AlertTypeModel, AlertType, Alert, ValidationResult } from '../../../../../types';
import { Comparator, AggregationType, GroupByType } from '../types';
import { COMPARATORS, AGGREGATION_TYPES, expressionFields } from '../../../../constants';
import {
  getMatchingIndicesForThresholdAlertType,
  getThresholdAlertTypeFields,
  loadIndexPatterns,
} from '../../../../lib/api';
import { useAppDependencies } from '../../../..';
import { ErrableFormRow } from '../../../../components/page_error';
import { getTimeOptions, getTimeFieldOptions } from '../../../../lib/get_time_options';
import { getTimeUnitLabel } from '../../../../lib/get_time_unit_label';
import { ThresholdVisualization } from './visualization';

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
  'triggerIntervalSize',
  'aggField',
  'termSize',
  'termField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

export function getActionType(): AlertTypeModel {
  return {
    id: 'threshold',
    name: 'Index Threshold',
    iconClass: 'alert',
    alertTypeParamsExpression: IndexThresholdAlertTypeExpression,
    validate: validateAlertType,
  };
}

export const aggregationTypes: { [key: string]: AggregationType } = {
  count: {
    text: 'count()',
    fieldRequired: false,
    value: AGGREGATION_TYPES.COUNT,
    validNormalizedTypes: [],
  },
  avg: {
    text: 'average()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.AVERAGE,
  },
  sum: {
    text: 'sum()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.SUM,
  },
  min: {
    text: 'min()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MIN,
  },
  max: {
    text: 'max()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MAX,
  },
};

export const comparators: { [key: string]: Comparator } = {
  [COMPARATORS.GREATER_THAN]: {
    text: i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.comparators.isAboveLabel', {
      defaultMessage: 'Is above',
    }),
    value: COMPARATORS.GREATER_THAN,
    requiredValues: 1,
  },
  [COMPARATORS.GREATER_THAN_OR_EQUALS]: {
    text: i18n.translate(
      'xpack.alertingUI.sections.alertAdd.threshold.comparators.isAboveOrEqualsLabel',
      {
        defaultMessage: 'Is above or equals',
      }
    ),
    value: COMPARATORS.GREATER_THAN_OR_EQUALS,
    requiredValues: 1,
  },
  [COMPARATORS.LESS_THAN]: {
    text: i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.comparators.isBelowLabel', {
      defaultMessage: 'Is below',
    }),
    value: COMPARATORS.LESS_THAN,
    requiredValues: 1,
  },
  [COMPARATORS.LESS_THAN_OR_EQUALS]: {
    text: i18n.translate(
      'xpack.alertingUI.sections.alertAdd.threshold.comparators.isBelowOrEqualsLabel',
      {
        defaultMessage: 'Is below or equals',
      }
    ),
    value: COMPARATORS.LESS_THAN_OR_EQUALS,
    requiredValues: 1,
  },
  [COMPARATORS.BETWEEN]: {
    text: i18n.translate(
      'xpack.alertingUI.sections.alertAdd.threshold.comparators.isBetweenLabel',
      {
        defaultMessage: 'Is between',
      }
    ),
    value: COMPARATORS.BETWEEN,
    requiredValues: 2,
  },
};

interface Props {
  alert: Alert;
  setAlertTypeParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

function validateAlertType(alert: Alert): ValidationResult {
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
    triggerIntervalSize: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!alert.alertTypeParams.index) {
    errors.index.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredIndexText', {
        defaultMessage: 'Index is required.',
      })
    );
  }
  if (!alert.alertTypeParams.timeField) {
    errors.timeField.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredTimeFieldText', {
        defaultMessage: 'Time field is required.',
      })
    );
  }
  if (!alert.alertTypeParams.triggerIntervalSize) {
    errors.triggerIntervalSize.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredTriggerIntervalSizeText', {
        defaultMessage: 'Trigger interval size is required.',
      })
    );
  }
  if (!alert.alertTypeParams.aggField) {
    errors.aggField.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredAggFieldText', {
        defaultMessage: 'Aggregation field is required.',
      })
    );
  }
  if (!alert.alertTypeParams.termSize) {
    errors.termSize.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredTermSizedText', {
        defaultMessage: 'Term size is required.',
      })
    );
  }
  if (!alert.alertTypeParams.termField) {
    errors.termField.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredtTermFieldText', {
        defaultMessage: 'Term field is required.',
      })
    );
  }
  if (!alert.alertTypeParams.timeWindowSize) {
    errors.timeWindowSize.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredTimeWindowSizeText', {
        defaultMessage: 'Time window size is required.',
      })
    );
  }
  if (
    alert.alertTypeParams.threshold &&
    alert.alertTypeParams.threshold.length > 0 &&
    !alert.alertTypeParams.threshold[0]
  ) {
    errors.threshold0.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredThreshold0Text', {
        defaultMessage: 'Threshold0, is required.',
      })
    );
  }
  if (
    alert.alertTypeParams.threshold &&
    alert.alertTypeParams.threshold.length > 1 &&
    !alert.alertTypeParams.threshold[1]
  ) {
    errors.threshold1.push(
      i18n.translate('xpack.alertingUI.sections.addAlert.error.requiredThreshold1Text', {
        defaultMessage: 'Threshold1 is required.',
      })
    );
  }
  return validationResult;
}

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<Props> = ({
  alert,
  setAlertTypeParams,
  errors,
  hasErrors,
}) => {
  const {
    core: { http },
  } = useAppDependencies();

  const {
    index,
    timeField,
    triggerIntervalSize,
    triggerIntervalUnit,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
  } = alert.alertTypeParams;

  const firstFieldOption = {
    text: i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.timeFieldOptionLabel', {
      defaultMessage: 'Select a field',
    }),
    value: '',
  };

  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const [indexPopoverOpen, setIndexPopoverOpen] = useState(false);
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [esFields, setEsFields] = useState<Record<string, any>>([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);
  const [alertThresholdPopoverOpen, setAlertThresholdPopoverOpen] = useState(false);
  const [alertDurationPopoverOpen, setAlertDurationPopoverOpen] = useState(false);

  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);

  const andThresholdText = i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.andLabel', {
    defaultMessage: 'AND',
  });

  const hasExpressionErrors = !!Object.keys(errors).find(
    errorKey => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  );

  const getIndexPatterns = async () => {
    const indexPatternObjects = await loadIndexPatterns();
    const titles = indexPatternObjects.map((indexPattern: any) => indexPattern.attributes.title);
    setIndexPatterns(titles);
  };

  const groupByTypes: { [key: string]: GroupByType } = {
    all: {
      text: i18n.translate(
        'xpack.alertingUI.sections.alertAdd.threshold.groupByLabel.allDocumentsLabel',
        {
          defaultMessage: 'all documents',
        }
      ),
      sizeRequired: false,
      value: 'all',
      validNormalizedTypes: [],
    },
    top: {
      text: i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.groupByLabel.topLabel', {
        defaultMessage: 'top',
      }),
      sizeRequired: true,
      value: 'top',
      validNormalizedTypes: ['number', 'date', 'keyword'],
    },
  };

  const expressionErrorMessage = i18n.translate(
    'xpack.alertingUI.sections.alertAdd.threshold.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultValues = useCallback(() => {
    setAlertTypeParams('aggType', DEFAULT_VALUES.AGGREGATION_TYPE);
    setAlertTypeParams('termSize', DEFAULT_VALUES.TERM_SIZE);
    setAlertTypeParams('thresholdComparator', DEFAULT_VALUES.THRESHOLD_COMPARATOR);
    setAlertTypeParams('timeWindowSize', DEFAULT_VALUES.TIME_WINDOW_SIZE);
    setAlertTypeParams('timeWindowUnit', DEFAULT_VALUES.TIME_WINDOW_UNIT);
    setAlertTypeParams('triggerIntervalSize', DEFAULT_VALUES.TRIGGER_INTERVAL_SIZE);
    setAlertTypeParams('triggerIntervalUnit', DEFAULT_VALUES.TRIGGER_INTERVAL_UNIT);
    setAlertTypeParams('groupBy', DEFAULT_VALUES.GROUP_BY);
    if (termField !== null) {
      setAlertTypeParams('groupBy', 'top');
    }
    setAlertTypeParams('threshold', DEFAULT_VALUES.THRESHOLD);
  }, [setAlertTypeParams, termField]);

  const getFields = useCallback(
    (indices: string[]) => {
      const fields = async () => {
        return await getThresholdAlertTypeFields({ indices, http });
      };
      return fields();
    },
    [http]
  );

  useEffect(() => {
    getIndexPatterns();
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
          'xpack.alertingUI.sections.alertAdd.threshold.indicesAndIndexPatternsLabel',
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
      label: i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.chooseLabel', {
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
          <ErrableFormRow
            id="indexSelectSearchBox"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.alertingUI.sections.alertAdd.threshold.indicesToQueryLabel"
                defaultMessage="Indices to query"
              />
            }
            errorKey="index"
            isShowingErrors={hasErrors && index !== undefined}
            errors={errors}
            helpText={
              <FormattedMessage
                id="xpack.alertingUI.sections.alertAdd.threshold.howToBroadenSearchQueryDescription"
                defaultMessage="Use * to broaden your query."
              />
            }
          >
            <EuiComboBox
              fullWidth
              async
              isLoading={isIndiciesLoading}
              noSuggestions={!indexOptions.length}
              options={indexOptions}
              data-test-subj="indicesComboBox"
              selectedOptions={(index || []).map((anIndex: string) => {
                return {
                  label: anIndex,
                  value: anIndex,
                };
              })}
              onChange={async (selected: EuiComboBoxOptionProps[]) => {
                setAlertTypeParams(
                  'index',
                  selected.map(aSelected => aSelected.value)
                );
                const indices = selected.map(s => s.value as string);

                // reset time field and expression fields if indices are deleted
                if (indices.length === 0) {
                  setTimeFieldOptions(getTimeFieldOptions([], firstFieldOption));
                  setAlertTypeParams('timeFields', []);

                  expressionFields.forEach(expressionField => {
                    setAlertTypeParams(expressionField, null);
                  });
                  return;
                }
                const currentEsFields = await getFields(indices);
                const timeFields = getTimeFieldOptions(currentEsFields, firstFieldOption);

                setEsFields(currentEsFields);
                setAlertTypeParams('timeFields', timeFields);
                setTimeFieldOptions(timeFields);
              }}
              onSearchChange={async search => {
                setIsIndiciesLoading(true);
                setIndexOptions(await getIndexOptions(search, indexPatterns));
                setIsIndiciesLoading(false);
              }}
              onBlur={() => {
                if (!index) {
                  setAlertTypeParams('index', []);
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ErrableFormRow
            id="timeField"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.alertingUI.sections.alertAdd.threshold.timeFieldLabel"
                defaultMessage="Time field"
              />
            }
            errorKey="timeField"
            isShowingErrors={hasErrors && timeField !== undefined}
            errors={errors}
          >
            <EuiSelect
              options={timeFieldOptions}
              fullWidth
              name="watchTimeField"
              data-test-subj="watchTimeFieldSelect"
              value={timeField}
              onChange={e => {
                setAlertTypeParams('timeField', e.target.value);
              }}
              onBlur={() => {
                if (timeField === undefined) {
                  setAlertTypeParams('timeField', '');
                }
              }}
            />
          </ErrableFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrableFormRow
            id="alertInterval"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.alertingUI.sections.alertAdd.threshold.watchIntervalLabel"
                defaultMessage="Run alert every"
              />
            }
            errorKey="triggerIntervalSize"
            isShowingErrors={hasErrors && triggerIntervalSize !== undefined}
            errors={errors}
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFieldNumber
                  fullWidth
                  min={1}
                  value={triggerIntervalSize}
                  data-test-subj="triggerIntervalSizeInput"
                  onChange={e => {
                    const { value } = e.target;
                    const triggerIntervalSizeVal = value !== '' ? parseInt(value, 10) : value;
                    setAlertTypeParams('triggerIntervalSize', triggerIntervalSizeVal);
                  }}
                  onBlur={e => {
                    if (triggerIntervalSize === undefined) {
                      setAlertTypeParams('triggerIntervalSize', '');
                    }
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  fullWidth
                  value={triggerIntervalUnit}
                  aria-label={i18n.translate(
                    'xpack.alertingUI.sections.alertAdd.threshold.durationAriaLabel',
                    {
                      defaultMessage: 'Duration time unit',
                    }
                  )}
                  onChange={e => {
                    setAlertTypeParams('triggerIntervalUnit', e.target.value);
                  }}
                  options={getTimeOptions(triggerIntervalSize)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </ErrableFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );

  return (
    <Fragment>
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="insidePopover"
            button={
              <EuiExpression
                description={i18n.translate(
                  'xpack.alertingUI.sections.alertAdd.threshold.insideLabel',
                  {
                    defaultMessage: 'inside',
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
          >
            <div>
              <EuiPopoverTitle>
                {i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.insideButtonLabel', {
                  defaultMessage: 'inside',
                })}
              </EuiPopoverTitle>
              {indexPopover}
            </div>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="aggTypePopover"
            button={
              <EuiExpression
                description={i18n.translate(
                  'xpack.alertingUI.sections.alertAdd.threshold.whenLabel',
                  {
                    defaultMessage: 'when',
                  }
                )}
                value={
                  aggregationTypes[aggType]
                    ? aggregationTypes[aggType].text
                    : aggregationTypes[DEFAULT_VALUES.AGGREGATION_TYPE].text
                }
                isActive={aggTypePopoverOpen}
                onClick={() => {
                  setAggTypePopoverOpen(true);
                }}
              />
            }
            isOpen={aggTypePopoverOpen}
            closePopover={() => {
              setAggTypePopoverOpen(false);
            }}
            ownFocus
            withTitle
            anchorPosition="downLeft"
          >
            <div>
              <EuiPopoverTitle>
                {i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.whenButtonLabel', {
                  defaultMessage: 'when',
                })}
              </EuiPopoverTitle>
              <EuiSelect
                value={aggType}
                onChange={e => {
                  setAlertTypeParams('aggType', e.target.value);
                  setAggTypePopoverOpen(false);
                }}
                options={Object.values(aggregationTypes).map(({ text, value }) => {
                  return {
                    text,
                    value,
                  };
                })}
              />
            </div>
          </EuiPopover>
        </EuiFlexItem>
        {aggType && aggregationTypes[aggType].fieldRequired ? (
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="aggFieldPopover"
              button={
                <EuiExpression
                  description={i18n.translate(
                    'xpack.alertingUI.sections.alertAdd.threshold.ofLabel',
                    {
                      defaultMessage: 'of',
                    }
                  )}
                  value={aggField || firstFieldOption.text}
                  isActive={aggFieldPopoverOpen || !aggField}
                  onClick={() => {
                    setAggFieldPopoverOpen(true);
                  }}
                  color={aggField ? 'secondary' : 'danger'}
                />
              }
              isOpen={aggFieldPopoverOpen}
              closePopover={() => {
                setAggFieldPopoverOpen(false);
              }}
              anchorPosition="downLeft"
            >
              <div>
                <EuiPopoverTitle>
                  {i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.ofButtonLabel', {
                    defaultMessage: 'of',
                  })}
                </EuiPopoverTitle>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false} className="watcherThresholdAlertAggFieldContainer">
                    <ErrableFormRow
                      errorKey="aggField"
                      isShowingErrors={hasErrors && aggField !== undefined}
                      errors={errors}
                    >
                      <EuiComboBox
                        singleSelection={{ asPlainText: true }}
                        placeholder={firstFieldOption.text}
                        options={esFields.reduce((esFieldOptions: any[], field: any) => {
                          if (
                            aggregationTypes[aggType].validNormalizedTypes.includes(
                              field.normalizedType
                            )
                          ) {
                            esFieldOptions.push({
                              label: field.name,
                            });
                          }
                          return esFieldOptions;
                        }, [])}
                        selectedOptions={aggField ? [{ label: aggField }] : []}
                        onChange={selectedOptions => {
                          setAlertTypeParams(
                            'aggField',
                            selectedOptions.length === 1 ? selectedOptions[0].label : undefined
                          );
                          setAggFieldPopoverOpen(false);
                        }}
                      />
                    </ErrableFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiPopover>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="groupByPopover"
            button={
              <EuiExpression
                description={`${
                  groupByTypes[groupBy || DEFAULT_VALUES.GROUP_BY].sizeRequired
                    ? i18n.translate(
                        'xpack.alertingUI.sections.alertAdd.threshold.groupedOverLabel',
                        {
                          defaultMessage: 'grouped over',
                        }
                      )
                    : i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.overLabel', {
                        defaultMessage: 'over',
                      })
                }`}
                value={`${groupByTypes[groupBy || DEFAULT_VALUES.GROUP_BY].text} ${
                  groupByTypes[groupBy || DEFAULT_VALUES.GROUP_BY].sizeRequired
                    ? `${termSize} ${termField ? `'${termField}'` : ''}`
                    : ''
                }`}
                isActive={groupByPopoverOpen || (groupBy === 'top' && !(termSize && termField))}
                onClick={() => {
                  setGroupByPopoverOpen(true);
                }}
                color={groupBy === 'all' || (termSize && termField) ? 'secondary' : 'danger'}
              />
            }
            isOpen={groupByPopoverOpen}
            closePopover={() => {
              setGroupByPopoverOpen(false);
            }}
            ownFocus
            withTitle
            anchorPosition="downLeft"
          >
            <div>
              <EuiPopoverTitle>
                {i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.overButtonLabel', {
                  defaultMessage: 'over',
                })}
              </EuiPopoverTitle>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    value={groupBy}
                    onChange={e => {
                      setAlertTypeParams('termSize', null);
                      setAlertTypeParams('termField', null);
                      setAlertTypeParams('groupBy', e.target.value);
                    }}
                    options={Object.values(groupByTypes).map(({ text, value }) => {
                      return {
                        text,
                        value,
                      };
                    })}
                  />
                </EuiFlexItem>

                {groupByTypes[groupBy || DEFAULT_VALUES.GROUP_BY].sizeRequired ? (
                  <Fragment>
                    <EuiFlexItem grow={false}>
                      <ErrableFormRow
                        errorKey="termSize"
                        isShowingErrors={hasErrors}
                        errors={errors}
                      >
                        <EuiFieldNumber
                          value={termSize || 0}
                          onChange={e => {
                            setAlertTypeParams('termSize', e.target.value);
                          }}
                          min={1}
                        />
                      </ErrableFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <ErrableFormRow
                        errorKey="termField"
                        isShowingErrors={hasErrors && termField !== undefined}
                        errors={errors}
                      >
                        <EuiSelect
                          value={termField || ''}
                          onChange={e => {
                            setAlertTypeParams('termField', e.target.value);
                          }}
                          options={esFields.reduce(
                            (options: any, field: any) => {
                              if (
                                groupByTypes[
                                  groupBy || DEFAULT_VALUES.GROUP_BY
                                ].validNormalizedTypes.includes(field.normalizedType)
                              ) {
                                options.push({
                                  text: field.name,
                                  value: field.name,
                                });
                              }
                              return options;
                            },
                            [firstFieldOption]
                          )}
                        />
                      </ErrableFormRow>
                    </EuiFlexItem>
                  </Fragment>
                ) : null}
              </EuiFlexGroup>
            </div>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="alertThresholdPopover"
            button={
              <EuiExpression
                data-test-subj="alertThresholdPopover"
                description={
                  comparators[thresholdComparator || DEFAULT_VALUES.THRESHOLD_COMPARATOR].text
                }
                value={(threshold || [])
                  .slice(
                    0,
                    comparators[thresholdComparator || DEFAULT_VALUES.THRESHOLD_COMPARATOR]
                      .requiredValues
                  )
                  .join(` ${andThresholdText} `)}
                isActive={Boolean(
                  alertThresholdPopoverOpen ||
                    (errors.threshold0 && errors.threshold0.length) ||
                    (errors.threshold1 && errors.threshold1.length)
                )}
                onClick={() => {
                  setAlertThresholdPopoverOpen(true);
                }}
                color={
                  (errors.threshold0 && errors.threshold0.length) ||
                  (errors.threshold1 && errors.threshold1.length)
                    ? 'danger'
                    : 'secondary'
                }
              />
            }
            isOpen={alertThresholdPopoverOpen}
            closePopover={() => {
              setAlertThresholdPopoverOpen(false);
            }}
            ownFocus
            withTitle
            anchorPosition="downLeft"
          >
            <div>
              <EuiPopoverTitle>
                {comparators[thresholdComparator || DEFAULT_VALUES.THRESHOLD_COMPARATOR].text}
              </EuiPopoverTitle>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    value={thresholdComparator}
                    onChange={e => {
                      setAlertTypeParams('thresholdComparator', e.target.value);
                    }}
                    options={Object.values(comparators).map(({ text, value }) => {
                      return { text, value };
                    })}
                  />
                </EuiFlexItem>
                {Array.from(
                  Array(
                    comparators[thresholdComparator || DEFAULT_VALUES.THRESHOLD_COMPARATOR]
                      .requiredValues
                  )
                ).map((_notUsed, i) => {
                  return (
                    <Fragment key={`threshold${i}`}>
                      {i > 0 ? (
                        <EuiFlexItem
                          grow={false}
                          className="alertThresholdWatchInBetweenComparatorText"
                        >
                          <EuiText>{andThresholdText}</EuiText>
                          {hasErrors && <EuiSpacer />}
                        </EuiFlexItem>
                      ) : null}
                      <EuiFlexItem grow={false}>
                        <ErrableFormRow
                          errorKey={`threshold${i}`}
                          isShowingErrors={hasErrors}
                          errors={errors}
                        >
                          <EuiFieldNumber
                            data-test-subj="alertThresholdInput"
                            value={!threshold || threshold[i] === null ? '' : threshold[i]}
                            min={0}
                            step={0.1}
                            onChange={e => {
                              const { value } = e.target;
                              const thresholdVal = value !== '' ? parseFloat(value) : value;
                              const newThreshold = [...threshold];
                              newThreshold[i] = thresholdVal;
                              setAlertTypeParams('threshold', newThreshold);
                            }}
                          />
                        </ErrableFormRow>
                      </EuiFlexItem>
                    </Fragment>
                  );
                })}
              </EuiFlexGroup>
            </div>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="watchDurationPopover"
            button={
              <EuiExpression
                description={i18n.translate(
                  'xpack.alertingUI.sections.alertAdd.threshold.forTheLastLabel',
                  {
                    defaultMessage: 'for the last',
                  }
                )}
                value={`${timeWindowSize} ${getTimeUnitLabel(
                  timeWindowUnit,
                  parseInt(timeWindowSize, 10).toString()
                )}`}
                isActive={alertDurationPopoverOpen || !timeWindowSize}
                onClick={() => {
                  setAlertDurationPopoverOpen(true);
                }}
                color={timeWindowSize ? 'secondary' : 'danger'}
              />
            }
            isOpen={alertDurationPopoverOpen}
            closePopover={() => {
              setAlertDurationPopoverOpen(false);
            }}
            ownFocus
            withTitle
            anchorPosition="downLeft"
          >
            <div>
              <EuiPopoverTitle>
                <FormattedMessage
                  id="xpack.alertingUI.sections.alertAdd.threshold.forTheLastButtonLabel"
                  defaultMessage="For the last"
                />
              </EuiPopoverTitle>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <ErrableFormRow
                    errorKey="timeWindowSize"
                    isShowingErrors={hasErrors}
                    errors={errors}
                  >
                    <EuiFieldNumber
                      min={1}
                      value={timeWindowSize || ''}
                      onChange={e => {
                        const { value } = e.target;
                        const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : value;
                        setAlertTypeParams('timeWindowSize', timeWindowSizeVal);
                      }}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    value={timeWindowUnit}
                    onChange={e => {
                      setAlertTypeParams('timeWindowUnit', e.target.value);
                    }}
                    options={getTimeOptions(timeWindowSize)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiText color="danger" size="s">
            {expressionErrorMessage}
          </EuiText>
          <EuiSpacer size="m" />
        </Fragment>
      ) : null}
      {hasErrors ? null : (
        <Fragment>
          <ThresholdVisualization />
        </Fragment>
      )}
      <EuiSpacer />
    </Fragment>
  );
};
