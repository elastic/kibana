/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover, EuiPopoverTitle, EuiSelect } from '@elastic/eui';
import { buildInAggregationTypes } from '../constants';
import { AggregationType } from '../types';

interface WhenExpressionProps {
  aggType?: string;
  defaultAggType: string;
  customAggTypesOptions?: { [key: string]: AggregationType };
  onChangeSelectedAggType: (selectedAggType: string) => void;
}

export const WhenExpression = ({
  aggType,
  defaultAggType,
  customAggTypesOptions,
  onChangeSelectedAggType,
}: WhenExpressionProps) => {
  const [aggTypePopoverOpen, setAggTypePopoverOpen] = useState(false);
  const aggregationTypes = customAggTypesOptions ?? buildInAggregationTypes;
  return (
    <EuiPopover
      id="aggTypePopover"
      button={
        <EuiExpression
          data-test-subj="whenExpression"
          description={i18n.translate(
            'xpack.triggersActionsUI.sections.alertAdd.threshold.whenLabel',
            {
              defaultMessage: 'when',
            }
          )}
          value={
            aggregationTypes[aggType ?? '']
              ? aggregationTypes[aggType ?? ''].text
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
          data-test-subj="whenExpressionSelect"
          value={aggType || defaultAggType}
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
