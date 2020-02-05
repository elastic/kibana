/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiText,
} from '@elastic/eui';
import { builtInComparators } from '../constants';
import { Comparator } from '../types';

interface ThresholdExpressionProps {
  thresholdComparator: string;
  defaultThresholdComparator: string;
  errors: { [key: string]: string[] };
  onChangeSelectedThresholdComparator: (selectedThresholdComparator?: string) => void;
  onChangeSelectedThreshold: (selectedThreshold?: number[]) => void;
  customComparators?: {
    [key: string]: Comparator;
  };
  threshold?: number[];
}

export const ThresholdExpression = ({
  thresholdComparator,
  defaultThresholdComparator,
  errors,
  onChangeSelectedThresholdComparator,
  onChangeSelectedThreshold,
  customComparators,
  threshold = [],
}: ThresholdExpressionProps) => {
  const comparators = customComparators ?? builtInComparators;
  const [alertThresholdPopoverOpen, setAlertThresholdPopoverOpen] = useState(false);

  const andThresholdText = i18n.translate(
    'xpack.triggersActionsUI.sections.alertAdd.threshold.andLabel',
    {
      defaultMessage: 'AND',
    }
  );

  return (
    <EuiPopover
      id="thresholdPopover"
      button={
        <EuiExpression
          data-test-subj="thresholdPopover"
          description={comparators[thresholdComparator || defaultThresholdComparator].text}
          value={(threshold || [])
            .slice(0, comparators[thresholdComparator || defaultThresholdComparator].requiredValues)
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
          {comparators[thresholdComparator || defaultThresholdComparator].text}
        </EuiPopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="comparatorOptionsComboBox"
              value={thresholdComparator}
              onChange={e => {
                onChangeSelectedThresholdComparator(e.target.value);
              }}
              options={Object.values(comparators).map(({ text, value }) => {
                return { text, value };
              })}
            />
          </EuiFlexItem>
          {Array.from(
            Array(comparators[thresholdComparator || defaultThresholdComparator].requiredValues)
          ).map((_notUsed, i) => {
            return (
              <Fragment key={`threshold${i}`}>
                {i > 0 ? (
                  <EuiFlexItem grow={false} className="alertThresholdWatchInBetweenComparatorText">
                    <EuiText>{andThresholdText}</EuiText>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiFormRow>
                    <EuiFieldNumber
                      data-test-subj="alertThresholdInput"
                      value={!threshold || threshold[i] === null ? 0 : threshold[i]}
                      min={0}
                      step={0.1}
                      onChange={e => {
                        const { value } = e.target;
                        const thresholdVal = value !== '' ? parseFloat(value) : undefined;
                        const newThreshold = [...threshold];
                        if (thresholdVal) {
                          newThreshold[i] = thresholdVal;
                        }
                        onChangeSelectedThreshold(newThreshold);
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </Fragment>
            );
          })}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
