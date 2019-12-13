/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { useEffect, useState, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { OnDataProviderEdited } from '../timeline/events';
import { QueryOperator } from '../timeline/data_providers/data_provider';

import {
  getCategorizedFieldNames,
  getExcludedFromSelection,
  getQueryOperatorFromSelection,
  operatorLabels,
  selectionsAreValid,
} from './helpers';

import * as i18n from './translations';

const EDIT_DATA_PROVIDER_WIDTH = 400;
const FIELD_COMBO_BOX_WIDTH = 195;
const OPERATOR_COMBO_BOX_WIDTH = 160;
const SAVE_CLASS_NAME = 'edit-data-provider-save';
const VALUE_INPUT_CLASS_NAME = 'edit-data-provider-value';

export const HeaderContainer = styled.div`
  width: ${EDIT_DATA_PROVIDER_WIDTH};
`;

HeaderContainer.displayName = 'HeaderContainer';

// SIDE EFFECT: the following `createGlobalStyle` overrides the default styling
// of euiComboBoxOptionsList because it's implemented as a popover, so it's
// not selectable as a child of the styled component
const StatefulEditDataProviderGlobalStyle = createGlobalStyle`
  .euiComboBoxOptionsList {
    z-index: 9999;
  }
`;

interface Props {
  andProviderId?: string;
  browserFields: BrowserFields;
  field: string;
  isExcluded: boolean;
  onDataProviderEdited: OnDataProviderEdited;
  operator: QueryOperator;
  providerId: string;
  timelineId: string;
  value: string | number;
}

const sanatizeValue = (value: string | number): string =>
  Array.isArray(value) ? `${value[0]}` : `${value}`; // fun fact: value should never be an array

export const getInitialOperatorLabel = (
  isExcluded: boolean,
  operator: QueryOperator
): EuiComboBoxOptionProps[] => {
  if (operator === ':') {
    return isExcluded ? [{ label: i18n.IS_NOT }] : [{ label: i18n.IS }];
  } else {
    return isExcluded ? [{ label: i18n.DOES_NOT_EXIST }] : [{ label: i18n.EXISTS }];
  }
};

export const StatefulEditDataProvider = React.memo<Props>(
  ({
    andProviderId,
    browserFields,
    field,
    isExcluded,
    onDataProviderEdited,
    operator,
    providerId,
    timelineId,
    value,
  }) => {
    const [updatedField, setUpdatedField] = useState<EuiComboBoxOptionProps[]>([{ label: field }]);
    const [updatedOperator, setUpdatedOperator] = useState<EuiComboBoxOptionProps[]>(
      getInitialOperatorLabel(isExcluded, operator)
    );
    const [updatedValue, setUpdatedValue] = useState<string | number>(value);

    /** Focuses the Value input if it is visible, falling back to the Save button if it's not */
    const focusInput = () => {
      const elements = document.getElementsByClassName(VALUE_INPUT_CLASS_NAME);

      if (elements.length > 0) {
        (elements[0] as HTMLElement).focus(); // this cast is required because focus() does not exist on every `Element` returned by `getElementsByClassName`
      } else {
        const saveElements = document.getElementsByClassName(SAVE_CLASS_NAME);

        if (saveElements.length > 0) {
          (saveElements[0] as HTMLElement).focus();
        }
      }
    };

    const onFieldSelected = useCallback((selectedField: EuiComboBoxOptionProps[]) => {
      setUpdatedField(selectedField);

      focusInput();
    }, []);

    const onOperatorSelected = useCallback((operatorSelected: EuiComboBoxOptionProps[]) => {
      setUpdatedOperator(operatorSelected);

      focusInput();
    }, []);

    const onValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setUpdatedValue(e.target.value);
    }, []);

    const disableScrolling = () => {
      const x =
        window.pageXOffset !== undefined
          ? window.pageXOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

      const y =
        window.pageYOffset !== undefined
          ? window.pageYOffset
          : (document.documentElement || document.body.parentNode || document.body).scrollTop;

      window.onscroll = () => window.scrollTo(x, y);
    };

    const enableScrolling = () => {
      window.onscroll = () => noop;
    };

    useEffect(() => {
      disableScrolling();
      focusInput();
      return () => {
        enableScrolling();
      };
    }, []);

    return (
      <>
        <EuiPanel paddingSize="s">
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="none" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiFormRow label={i18n.FIELD}>
                    <EuiToolTip content={updatedField.length > 0 ? updatedField[0].label : null}>
                      <EuiComboBox
                        data-test-subj="field"
                        isClearable={false}
                        onChange={onFieldSelected}
                        options={getCategorizedFieldNames(browserFields)}
                        placeholder={i18n.FIELD_PLACEHOLDER}
                        selectedOptions={updatedField}
                        singleSelection={{ asPlainText: true }}
                        style={{ width: `${FIELD_COMBO_BOX_WIDTH}px` }}
                      />
                    </EuiToolTip>
                  </EuiFormRow>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiFormRow label={i18n.OPERATOR}>
                    <EuiComboBox
                      data-test-subj="operator"
                      isClearable={false}
                      onChange={onOperatorSelected}
                      options={operatorLabels}
                      placeholder={i18n.SELECT_AN_OPERATOR}
                      selectedOptions={updatedOperator}
                      singleSelection={{ asPlainText: true }}
                      style={{ width: `${OPERATOR_COMBO_BOX_WIDTH}px` }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiSpacer />
            </EuiFlexItem>

            {updatedOperator.length > 0 &&
            updatedOperator[0].label !== i18n.EXISTS &&
            updatedOperator[0].label !== i18n.DOES_NOT_EXIST ? (
              <EuiFlexItem grow={false}>
                <EuiFormRow label={i18n.VALUE_LABEL}>
                  <EuiFieldText
                    className={VALUE_INPUT_CLASS_NAME}
                    data-test-subj="value"
                    onChange={onValueChange}
                    placeholder={i18n.VALUE}
                    value={sanatizeValue(updatedValue)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}

            <EuiFlexItem grow={false}>
              <EuiSpacer />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    autoFocus
                    className={SAVE_CLASS_NAME}
                    color="primary"
                    data-test-subj="save"
                    fill={true}
                    isDisabled={
                      !selectionsAreValid({
                        browserFields,
                        selectedField: updatedField,
                        selectedOperator: updatedOperator,
                      })
                    }
                    onClick={() => {
                      onDataProviderEdited({
                        andProviderId,
                        excluded: getExcludedFromSelection(updatedOperator),
                        field: updatedField.length > 0 ? updatedField[0].label : '',
                        id: timelineId,
                        operator: getQueryOperatorFromSelection(updatedOperator),
                        providerId,
                        value: updatedValue,
                      });
                    }}
                    size="s"
                  >
                    {i18n.SAVE}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <StatefulEditDataProviderGlobalStyle />
      </>
    );
  }
);

StatefulEditDataProvider.displayName = 'StatefulEditDataProvider';
