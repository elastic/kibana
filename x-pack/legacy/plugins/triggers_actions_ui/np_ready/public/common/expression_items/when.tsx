/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover, EuiPopoverTitle, EuiSelect } from '@elastic/eui';
import { AGGREGATION_TYPES } from '../constants';
import { AggregationType } from '../types';

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

interface WhenExpressionProps {
  aggType: string;
  defaultAggType: string;
  onChangeSelectedAggType: (selectedAggType: string) => void;
}

export const WhenExpression = ({
  aggType,
  defaultAggType,
  onChangeSelectedAggType,
}: WhenExpressionProps) => {
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);

  return (
    <EuiPopover
      id="aggTypePopover"
      button={
        <EuiExpression
          description={i18n.translate(
            'xpack.triggersActionsUI.sections.alertAdd.threshold.whenLabel',
            {
              defaultMessage: 'when',
            }
          )}
          value={
            aggregationTypes[aggType]
              ? aggregationTypes[aggType].text
              : aggregationTypes[defaultAggType].text
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
          {i18n.translate('xpack.triggersActionsUI.sections.alertAdd.threshold.whenButtonLabel', {
            defaultMessage: 'when',
          })}
        </EuiPopoverTitle>
        <EuiSelect
          value={aggType || ''}
          fullWidth
          onChange={e => {
            onChangeSelectedAggType(e.target.value);
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
  );
};
