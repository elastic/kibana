/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
} from '@elastic/eui';
import { AlertTypeModel, AlertType, Alert, ValidationResult } from '../../../../types';
import { Comparator, AggregationType, GroupByType } from './types';
import { COMPARATORS, AGGREGATION_TYPES, TIME_UNITS } from '../../../constants';
import {
  getMatchingIndicesForThresholdAlertType,
  getThresholdAlertTypeFields,
} from '../../../lib/api';
import { getTimeUnitLabel } from '../../../lib/get_time_unit_label';
import { useAppDependencies } from '../../..';

const DEFAULT_VALUES = {
  AGG_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  TRIGGER_INTERVAL_SIZE: 1,
  TRIGGER_INTERVAL_UNIT: 'm',
  THRESHOLD: [1000, 5000],
  GROUP_BY: 'all',
};

export function getActionType(): AlertTypeModel {
  return {
    id: 'threshold',
    name: 'Index Threshold',
    iconClass: 'alert',
    alertTypeParamsExpression: IndexThresholdAlertTypeExpression,
    validate: validateAlertType,
  };
}

interface Props {
  alert: Alert;
  setAlertTypeParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

function validateAlertType(alert: Alert): ValidationResult {
  return { errors: {} };
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
  const firstFieldOption = {
    text: i18n.translate('xpack.alertingUI.sections.alertAdd.threshold.timeFieldOptionLabel', {
      defaultMessage: 'Select a field',
    }),
    value: '',
  };

  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const [indexPattern, setIndexPattern] = useState([]);
  const [esFields, setEsFields] = useState([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

  const [aggFieldPopoverOpen, setAggFieldPopoverOpen] = useState(false);
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);

  const comparators: { [key: string]: Comparator } = {
    [COMPARATORS.GREATER_THAN]: {
      text: i18n.translate(
        'xpack.alertingUI.sections.alertAdd.threshold.comparators.isAboveLabel',
        {
          defaultMessage: 'Is above',
        }
      ),
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
      text: i18n.translate(
        'xpack.alertingUI.sections.alertAdd.threshold.comparators.isBelowLabel',
        {
          defaultMessage: 'Is below',
        }
      ),
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

  const aggregationTypes: { [key: string]: AggregationType } = {
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

  const groupByTypes: { [key: string]: GroupByType } = {
    all: {
      text: i18n.translate(
        'xpack.watcher.thresholdWatchExpression.groupByLabel.allDocumentsLabel',
        {
          defaultMessage: 'all documents',
        }
      ),
      sizeRequired: false,
      value: 'all',
      validNormalizedTypes: [],
    },
    top: {
      text: i18n.translate('xpack.watcher.thresholdWatchExpression.groupByLabel.topLabel', {
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

  const getTimeOptions = (unitSize: string) =>
    Object.entries(TIME_UNITS).map(([_key, value]) => {
      return {
        text: getTimeUnitLabel(value, unitSize),
        value,
      };
    });

  const getFields = async (indices: string[]) => {
    return await getThresholdAlertTypeFields({ indices, http });
  };
  const getTimeFieldOptions = (fields: any) => {
    const options = [firstFieldOption];

    fields.forEach((field: any) => {
      if (field.type === 'date') {
        options.push({
          text: field.name,
          value: field.name,
        });
      }
    });
    return options;
  };

  interface IOption {
    label: string;
    options: Array<{ value: string; label: string }>;
  }

  const getIndexOptions = async (pattern: string, indexPatterns: string[]) => {
    const options: IOption[] = [];

    if (!pattern) {
      return options;
    }

    const matchingIndices = (await getMatchingIndicesForThresholdAlertType({
      pattern,
      http,
    })) as string[];
    const matchingIndexPatterns = indexPatterns.filter(anIndexPattern => {
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

  return (
    <EuiFlexGroup gutterSize="s">
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
                aggregationTypes[alert.alertTypeParams.aggType]
                  ? aggregationTypes[alert.alertTypeParams.aggType].text
                  : aggregationTypes[DEFAULT_VALUES.AGG_TYPE].text
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
              value={alert.alertTypeParams.aggType}
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
    </EuiFlexGroup>
  );
};
