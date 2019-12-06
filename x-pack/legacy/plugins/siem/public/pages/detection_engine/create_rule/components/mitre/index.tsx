/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiFormControlLayout,
} from '@elastic/eui';
import { isEmpty, kebabCase, camelCase } from 'lodash/fp';
import React, { ChangeEvent, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';
import * as CreateRuleI18n from '../../translations';
import { FieldHook, getFieldValidityAndErrorMessage } from '../shared_imports';
import * as I18n from './translations';
import { IMitreEnterpriseAttack } from '../../types';

const MyEuiFormControlLayout = styled(EuiFormControlLayout)`
  .euiComboBox__inputWrap {
    height: 32px !important;
    overflow-y: scroll;
  }
`;
interface AddItemProps {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

export const AddMitreThreat = ({ dataTestSubj, field, idAria, isDisabled }: AddItemProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const removeItem = useCallback(
    (index: number) => {
      const values = field.value as string[];
      field.setValue([...values.slice(0, index), ...values.slice(index + 1)]);
    },
    [field]
  );

  const addItem = useCallback(() => {
    const values = field.value as IMitreEnterpriseAttack[];
    const { id, name, reference } = tacticsOptions[0];
    if (!isEmpty(values[values.length - 1])) {
      field.setValue([...values, { tactic: { id, name, reference }, techniques: [] }]);
    } else {
      field.setValue([{ tactic: { id, name, reference }, techniques: [] }]);
    }
  }, [field]);

  const updateTactic = useCallback(
    (index: number, event: ChangeEvent<HTMLSelectElement>) => {
      const values = field.value as IMitreEnterpriseAttack[];
      const { id, reference, name } = tacticsOptions.find(t => t.value === event.target.value) || {
        id: '',
        name: '',
        reference: '',
      };
      field.setValue([
        ...values.slice(0, index),
        {
          ...values[index],
          tactic: { id, reference, name },
        },
        ...values.slice(index + 1),
      ]);
    },
    [field]
  );

  const updateTechniques = useCallback(
    (index: number, selectedOptions: unknown[]) => {
      field.setValue([
        ...values.slice(0, index),
        {
          ...values[index],
          techniques: selectedOptions,
        },
        ...values.slice(index + 1),
      ]);
    },
    [field]
  );

  const values = field.value as IMitreEnterpriseAttack[];
  const selectTacticOptions = useMemo(
    () => tacticsOptions.map(t => ({ text: t.text, value: t.value })),
    [tacticsOptions]
  );
  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        {values.map((item, index) => {
          const euiSelectFieldProps = {
            disabled: isDisabled,
          };
          return (
            <div key={index}>
              <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    id="selectDocExample"
                    options={selectTacticOptions}
                    aria-label=""
                    onChange={updateTactic.bind(null, index)}
                    prepend={I18n.TACTIC}
                    compressed
                    fullWidth={false}
                    value={camelCase(item.tactic.name)}
                    {...euiSelectFieldProps}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <MyEuiFormControlLayout compressed fullWidth prepend={I18n.TECHNIQUES}>
                    <EuiComboBox
                      compressed
                      placeholder="Select from a list of options"
                      options={techniquesOptions.filter(t =>
                        t.tactics.includes(kebabCase(item.tactic.name))
                      )}
                      selectedOptions={item.techniques}
                      onChange={updateTechniques.bind(null, index)}
                      isDisabled={isDisabled}
                      fullWidth={true}
                    />
                  </MyEuiFormControlLayout>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="danger"
                    iconType="trash"
                    isDisabled={isDisabled}
                    onClick={() => removeItem(index)}
                    aria-label={CreateRuleI18n.DELETE}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              {values.length - 1 !== index && <EuiSpacer size="s" />}
            </div>
          );
        })}
        <EuiButtonEmpty size="xs" onClick={addItem} isDisabled={isDisabled}>
          {I18n.ADD_MITRE_ATTACK}
        </EuiButtonEmpty>
      </>
    </EuiFormRow>
  );
};
