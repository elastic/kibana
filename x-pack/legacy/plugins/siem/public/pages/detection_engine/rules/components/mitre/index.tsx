/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFormRow,
  EuiSuperSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiText,
} from '@elastic/eui';
import { isEmpty, kebabCase, camelCase } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';
import * as Rulei18n from '../../translations';
import { FieldHook, getFieldValidityAndErrorMessage } from '../shared_imports';
import { threatsDefault } from '../step_about_rule/default_value';
import { IMitreEnterpriseAttack } from '../../types';
import { isMitreAttackInvalid } from './helpers';
import * as i18n from './translations';

const MitreContainer = styled.div`
  margin-top: 16px;
`;
const MyEuiSuperSelect = styled(EuiSuperSelect)`
  width: 280px;
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
      const newValues = [...values.slice(0, index), ...values.slice(index + 1)];
      if (isEmpty(newValues)) {
        field.setValue(threatsDefault);
      } else {
        field.setValue(newValues);
      }
    },
    [field]
  );

  const addItem = useCallback(() => {
    const values = field.value as IMitreEnterpriseAttack[];
    if (!isEmpty(values[values.length - 1])) {
      field.setValue([
        ...values,
        { tactic: { id: 'none', name: 'none', reference: 'none' }, techniques: [] },
      ]);
    } else {
      field.setValue([{ tactic: { id: 'none', name: 'none', reference: 'none' }, techniques: [] }]);
    }
  }, [field]);

  const updateTactic = useCallback(
    (index: number, value: string) => {
      const values = field.value as IMitreEnterpriseAttack[];
      const { id, reference, name } = tacticsOptions.find(t => t.value === value) || {
        id: '',
        name: '',
        reference: '',
      };
      field.setValue([
        ...values.slice(0, index),
        {
          ...values[index],
          tactic: { id, reference, name },
          techniques: [],
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

  const getSelectTactic = (tacticName: string, index: number, disabled: boolean) => (
    <MyEuiSuperSelect
      id="selectDocExample"
      options={[
        ...(tacticName === 'none'
          ? [
              {
                inputDisplay: <>{i18n.TACTIC_PLACEHOLDER}</>,
                value: 'none',
                disabled,
              },
            ]
          : []),
        ...tacticsOptions.map(t => ({
          inputDisplay: <>{t.text}</>,
          value: t.value,
          disabled,
        })),
      ]}
      aria-label=""
      onChange={updateTactic.bind(null, index)}
      fullWidth={false}
      valueOfSelected={camelCase(tacticName)}
    />
  );

  const getSelectTechniques = (item: IMitreEnterpriseAttack, index: number, disabled: boolean) => {
    const invalid = isMitreAttackInvalid(item.tactic.name, item.techniques);
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow>
          <EuiComboBox
            placeholder={i18n.TECHNIQUES_PLACEHOLDER}
            options={techniquesOptions.filter(t => t.tactics.includes(kebabCase(item.tactic.name)))}
            selectedOptions={item.techniques}
            onChange={updateTechniques.bind(null, index)}
            isDisabled={disabled}
            fullWidth={true}
            isInvalid={invalid}
          />
          {invalid && (
            <EuiText color="danger" size="xs">
              <p>{errorMessage}</p>
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            isDisabled={disabled}
            onClick={() => removeItem(index)}
            aria-label={Rulei18n.DELETE}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <MitreContainer>
      {values.map((item, index) => (
        <div key={index}>
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              {index === 0 ? (
                <EuiFormRow
                  label={`${field.label} ${i18n.TACTIC}`}
                  labelAppend={field.labelAppend}
                  describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                >
                  <>{getSelectTactic(item.tactic.name, index, isDisabled)}</>
                </EuiFormRow>
              ) : (
                getSelectTactic(item.tactic.name, index, isDisabled)
              )}
            </EuiFlexItem>
            <EuiFlexItem grow>
              {index === 0 ? (
                <EuiFormRow
                  label={`${field.label} ${i18n.TECHNIQUE}`}
                  isInvalid={isInvalid}
                  fullWidth
                  describedByIds={idAria ? [`${idAria} ${i18n.TECHNIQUE}`] : undefined}
                >
                  <>{getSelectTechniques(item, index, isDisabled)}</>
                </EuiFormRow>
              ) : (
                getSelectTechniques(item, index, isDisabled)
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          {values.length - 1 !== index && <EuiSpacer size="s" />}
        </div>
      ))}
      <EuiButtonEmpty size="xs" onClick={addItem} isDisabled={isDisabled} iconType="plusInCircle">
        {i18n.ADD_MITRE_ATTACK}
      </EuiButtonEmpty>
    </MitreContainer>
  );
};
