/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFieldNumber,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isNil } from 'lodash';
import type { Comparator } from '@kbn/alerting-comparators';
import { builtInComparators } from '../constants';
import type { IErrorObject } from '../../types';
import { ClosablePopoverTitle } from './components';

export interface ThresholdExpressionProps {
  thresholdComparator: string;
  errors: IErrorObject;
  onChangeSelectedThresholdComparator: (selectedThresholdComparator?: string) => void;
  onChangeSelectedThreshold: (selectedThreshold?: number[]) => void;
  customComparators?: {
    [key: string]: Comparator;
  };
  threshold?: number[];
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
  unit?: string;
  // Open the value popover as soon as this expression mounts, e.g. when a
  // caller adds a new, previously-hidden threshold row and wants to guide
  // the user straight to filling it in rather than leaving it looking like
  // an unexplained invalid state. Only affects the initial render.
  initialPopoverOpen?: boolean;
  // Rendered immediately after the threshold value, inside the same
  // expression button. Must not contain interactive elements (buttons,
  // links) — EuiExpression renders as a native <button>, so anything
  // clickable nested inside it is invalid HTML and won't get its own click
  // handling; put a bare label/icon here, not controls.
  badge?: React.ReactNode;
}

export const ThresholdExpression = ({
  thresholdComparator,
  errors,
  onChangeSelectedThresholdComparator,
  onChangeSelectedThreshold,
  customComparators,
  display = 'inline',
  threshold = [],
  popupPosition,
  unit = '',
  initialPopoverOpen = false,
  badge,
}: ThresholdExpressionProps) => {
  const { euiTheme } = useEuiTheme();
  const comparators = customComparators ?? builtInComparators;
  const [alertThresholdPopoverOpen, setAlertThresholdPopoverOpen] = useState(initialPopoverOpen);
  const [comparator, setComparator] = useState<string>(thresholdComparator);
  const [numRequiredThresholds, setNumRequiredThresholds] = useState<number>(
    comparators[thresholdComparator].requiredValues
  );
  const hasThresholdError = Boolean(
    (errors.threshold0 && errors.threshold0.length) ||
      (errors.threshold1 && errors.threshold1.length)
  );
  // A badge (and, for the warning row, a remove button positioned over this
  // expression) leaves no safe place for EuiExpression's own invalid icon to
  // render without colliding with it. The description text is already
  // colored red via `color`, so fall back to a border instead of the icon
  // whenever a badge is present.
  const hasBadge = Boolean(badge);

  const andThresholdText = i18n.translate(
    'xpack.triggersActionsUI.common.expressionItems.threshold.andLabel',
    {
      defaultMessage: 'AND',
    }
  );

  const thresholdText =
    (threshold || []).slice(0, numRequiredThresholds).join(` ${andThresholdText} `) + unit;

  useEffect(() => {
    const updateThresholdValue = comparators[comparator].requiredValues !== numRequiredThresholds;
    if (updateThresholdValue) {
      const thresholdValues = threshold.slice(0, comparators[comparator].requiredValues);
      onChangeSelectedThreshold(thresholdValues);
      setNumRequiredThresholds(comparators[comparator].requiredValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparator]);

  return (
    <EuiPopover
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.common.expressionItems.threshold.popoverAriaLabel',
        { defaultMessage: 'Threshold' }
      )}
      button={
        <EuiExpression
          data-test-subj="thresholdPopover"
          description={comparators[comparator].text}
          value={
            hasBadge ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: euiTheme.size.xs }}>
                {thresholdText}
                {badge}
              </span>
            ) : (
              thresholdText
            )
          }
          isActive={Boolean(alertThresholdPopoverOpen || hasThresholdError)}
          onClick={() => {
            setAlertThresholdPopoverOpen(true);
          }}
          display={display === 'inline' ? 'inline' : 'columns'}
          isInvalid={hasBadge ? false : hasThresholdError}
          color={hasBadge && hasThresholdError ? 'danger' : undefined}
          style={
            hasBadge && hasThresholdError
              ? {
                  border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.danger}`,
                  borderRadius: euiTheme.border.radius.medium,
                }
              : undefined
          }
        />
      }
      isOpen={alertThresholdPopoverOpen}
      closePopover={() => {
        setAlertThresholdPopoverOpen(false);
      }}
      ownFocus
      display={display === 'fullWidth' ? 'block' : 'inline-block'}
      anchorPosition={popupPosition ?? 'downLeft'}
      repositionOnScroll
    >
      <div>
        <ClosablePopoverTitle
          onClose={() => setAlertThresholdPopoverOpen(false)}
          dataTestSubj="thresholdPopoverTitle"
        >
          <>{comparators[comparator].text}</>
        </ClosablePopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="comparatorOptionsComboBox"
              value={comparator}
              onChange={(e) => {
                setComparator(e.target.value);
                onChangeSelectedThresholdComparator(e.target.value);
              }}
              options={Object.values(comparators).map(({ text, value }) => {
                return { text, value };
              })}
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.common.expressionItems.threshold.comparatorAriaLabel',
                { defaultMessage: 'Threshold comparator' }
              )}
            />
          </EuiFlexItem>
          {Array.from(Array(numRequiredThresholds)).map((_notUsed, i) => {
            return (
              <Fragment key={`threshold${i}`}>
                {i > 0 ? (
                  <EuiFlexItem
                    grow={false}
                    className="watcherThresholdWatchInBetweenComparatorText"
                  >
                    <EuiText>{andThresholdText}</EuiText>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiFormRow
                    isInvalid={Number(errors[`threshold${i}`]?.length) > 0 || isNil(threshold[i])}
                    error={errors[`threshold${i}`] as string[]}
                  >
                    <EuiFieldNumber
                      data-test-subj={`alertThresholdInput${i}`}
                      min={0}
                      value={!threshold || threshold[i] === undefined ? '' : threshold[i]}
                      isInvalid={Number(errors[`threshold${i}`]?.length) > 0 || isNil(threshold[i])}
                      onChange={(e) => {
                        const { value } = e.target;
                        const thresholdVal = value !== '' ? parseFloat(value) : undefined;
                        const newThreshold = [...threshold];
                        if (thresholdVal !== undefined) {
                          newThreshold[i] = thresholdVal;
                        } else {
                          delete newThreshold[i];
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

// eslint-disable-next-line import/no-default-export
export { ThresholdExpression as default };
