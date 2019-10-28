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
import { AlertTypeModel, AlertType, Alert } from '../../../../types';
import { Comparator, AggregationType, GroupByType } from './types';
import { COMPARATORS, AGGREGATION_TYPES } from '../../../constants';

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
    aggType: DEFAULT_VALUES.AGG_TYPE,
    alertTypeParamsExpression: IndexThresholdAlertTypeExpression,
  };
}

interface Props {
  alert: Alert;
  setAlertTypeParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<Props> = ({
  alert,
  setAlertTypeParams,
  errors,
  hasErrors,
}) => {
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);

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
