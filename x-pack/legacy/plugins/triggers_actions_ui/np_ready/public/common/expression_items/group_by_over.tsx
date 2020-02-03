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
} from '@elastic/eui';
import { buildinGroupByTypes } from '../constants';
import { GroupByType } from '../types';

interface GroupByExpressionProps {
  groupBy: string;
  defaultGroupBy: string;
  errors: { [key: string]: string[] };
  onChangeSelectedTermSize: (selectedTermSize?: number) => void;
  onChangeSelectedTermField: (selectedTermField?: string) => void;
  onChangeSelectedGroupBy: (selectedGroupBy?: string) => void;
  fields: Record<string, any>;
  termSize?: number;
  termField?: string;
  customGroupByTypes?: {
    [key: string]: GroupByType;
  };
}

export const GroupByExpression = ({
  groupBy,
  defaultGroupBy,
  errors,
  onChangeSelectedTermSize,
  onChangeSelectedTermField,
  onChangeSelectedGroupBy,
  fields,
  termSize = 1,
  termField,
  customGroupByTypes,
}: GroupByExpressionProps) => {
  const groupByTypes = customGroupByTypes ?? buildinGroupByTypes;
  const [groupByPopoverOpen, setGroupByPopoverOpen] = useState(false);

  const firstFieldOption = {
    text: i18n.translate('xpack.triggersActionsUI.common.groupByType.timeFieldOptionLabel', {
      defaultMessage: 'Select a field',
    }),
    value: '',
  };

  return (
    <EuiPopover
      id="groupByPopover"
      button={
        <EuiExpression
          description={`${
            groupByTypes[groupBy || defaultGroupBy].sizeRequired
              ? i18n.translate('xpack.triggersActionsUI.common.groupByType.groupedOverLabel', {
                  defaultMessage: 'grouped over',
                })
              : i18n.translate('xpack.triggersActionsUI.common.groupByType.overLabel', {
                  defaultMessage: 'over',
                })
          }`}
          value={`${groupByTypes[groupBy || defaultGroupBy].text} ${
            groupByTypes[groupBy || defaultGroupBy].sizeRequired
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
          {i18n.translate('xpack.triggersActionsUI.common.groupByType.overButtonLabel', {
            defaultMessage: 'over',
          })}
        </EuiPopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiSelect
              data-test-subj="overExpressionSelect"
              value={groupBy || defaultGroupBy}
              onChange={e => {
                onChangeSelectedTermSize(undefined);
                onChangeSelectedTermField(undefined);
                onChangeSelectedGroupBy(e.target.value);
              }}
              options={Object.values(groupByTypes).map(({ text, value }) => {
                return {
                  text,
                  value,
                };
              })}
            />
          </EuiFlexItem>

          {groupByTypes[groupBy || defaultGroupBy].sizeRequired ? (
            <Fragment>
              <EuiFlexItem grow={false}>
                <EuiFormRow isInvalid={errors.termSize.length > 0} error={errors.termSize}>
                  <EuiFieldNumber
                    isInvalid={errors.termSize.length > 0}
                    value={termSize || 1}
                    onChange={e => {
                      const { value } = e.target;
                      const termSizeVal = value !== '' ? parseFloat(value) : undefined;
                      onChangeSelectedTermSize(termSizeVal);
                    }}
                    min={1}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  isInvalid={errors.termField.length > 0 && termField !== undefined}
                  error={errors.termField}
                >
                  <EuiSelect
                    data-test-subj="fieldsExpressionSelect"
                    value={termField || ''}
                    isInvalid={errors.termField.length > 0 && termField !== undefined}
                    onChange={e => {
                      onChangeSelectedTermField(e.target.value);
                    }}
                    options={fields.reduce(
                      (options: any, field: any) => {
                        if (
                          groupByTypes[groupBy || defaultGroupBy].validNormalizedTypes.includes(
                            field.normalizedType
                          )
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
                </EuiFormRow>
              </EuiFlexItem>
            </Fragment>
          ) : null}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
