/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiSelect,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldNumber,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getTimeUnitLabel } from '../lib/get_time_unit_label';
import type { TIME_UNITS } from '../../application/constants';
import { getTimeOptions } from '../lib/get_time_options';
import { ClosablePopoverTitle } from './components';
import type { IErrorObject } from '../../types';

export interface ForLastExpressionProps {
  description?: string;
  timeWindowSize?: number;
  timeWindowUnit?: string;
  errors: IErrorObject;
  isTimeSizeBelowRecommended?: boolean;
  onChangeWindowSize: (selectedWindowSize: number | undefined) => void;
  onChangeWindowUnit: (selectedWindowUnit: string) => void;
  popupPosition?:
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
  display?: 'fullWidth' | 'inline';
}

const FOR_LAST_LABEL = i18n.translate(
  'xpack.triggersActionsUI.common.expressionItems.forTheLast.descriptionLabel',
  {
    defaultMessage: 'for the last',
  }
);

const RECOMMENDED_TIMESIZE_WARNING = i18n.translate(
  'xpack.triggersActionsUI.common.expressionItems.forTheLast.recommendedTimeSizeError',
  {
    defaultMessage: 'Minimum 5 minutes recommended',
  }
);
export const ForLastExpression = ({
  timeWindowSize,
  timeWindowUnit = 's',
  display = 'inline',
  errors,
  onChangeWindowSize,
  onChangeWindowUnit,
  popupPosition,
  isTimeSizeBelowRecommended = false,
  description = FOR_LAST_LABEL,
}: ForLastExpressionProps) => {
  const [alertDurationPopoverOpen, setAlertDurationPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiExpression
          description={description}
          data-test-subj="forLastExpression"
          value={`${timeWindowSize ?? '?'} ${getTimeUnitLabel(
            timeWindowUnit as TIME_UNITS,
            (timeWindowSize ?? '').toString()
          )}`}
          isActive={alertDurationPopoverOpen}
          onClick={() => {
            setAlertDurationPopoverOpen(!alertDurationPopoverOpen);
          }}
          display={display === 'inline' ? 'inline' : 'columns'}
          isInvalid={!timeWindowSize}
        />
      }
      isOpen={alertDurationPopoverOpen}
      closePopover={() => {
        setAlertDurationPopoverOpen(false);
      }}
      ownFocus
      display={display === 'fullWidth' ? 'block' : 'inline-block'}
      anchorPosition={popupPosition ?? 'downLeft'}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle onClose={() => setAlertDurationPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.triggersActionsUI.common.expressionItems.forTheLast.popoverTitle"
            defaultMessage="For the last"
          />
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              isInvalid={Number(errors.timeWindowSize?.length) > 0 || isTimeSizeBelowRecommended}
              error={
                isTimeSizeBelowRecommended
                  ? [RECOMMENDED_TIMESIZE_WARNING]
                  : (errors.timeWindowSize as string[])
              }
            >
              <EuiFieldNumber
                data-test-subj="timeWindowSizeNumber"
                isInvalid={Number(errors.timeWindowSize?.length) > 0 || isTimeSizeBelowRecommended}
                min={0}
                value={timeWindowSize || ''}
                onChange={(e) => {
                  const { value } = e.target;
                  const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : undefined;
                  onChangeWindowSize(timeWindowSizeVal);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={(e) => {
                onChangeWindowUnit(e.target.value);
              }}
              options={getTimeOptions(timeWindowSize ?? 1)}
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.common.expressionItems.forTheLast.timeWindowUnitAriaLabel',
                {
                  defaultMessage: 'Time unit',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {isTimeSizeBelowRecommended && <RecommendedTimeSizeWarning />}
      </div>
    </EuiPopover>
  );
};

// eslint-disable-next-line import/no-default-export
export { ForLastExpression as default };

function RecommendedTimeSizeWarning() {
  const description = i18n.translate(
    'xpack.triggersActionsUI.observability.rules.customThreshold.recommendedTimeSizeWarning.description',
    {
      defaultMessage:
        'Recommended minimum value is 5 minutes. This is to ensure, that the alert has enough data to evaluate. If you choose a lower values, the alert may not work as expected.',
    }
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        title={i18n.translate(
          'xpack.triggersActionsUI.observability.rules.customThreshold.recommendedTimeSizeWarning.title',
          { defaultMessage: `Value is too low, possible alerting noise` }
        )}
        color="warning"
        iconType="warning"
        size="s"
        css={css`
          max-width: 400px;
        `}
      >
        <p>{description}</p>
      </EuiCallOut>
    </>
  );
}
