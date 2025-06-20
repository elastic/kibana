/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  TextFieldWithMessageVariables,
  TextAreaWithMessageVariables,
  ActionParamsProps,
  JsonEditorWithMessageVariables,
  ActionConnectorMode,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect, EuiComboBox, EuiSwitch } from '@elastic/eui';
import { ExecutorParams, ExecutorSubActionCreateAlertParams } from '../../../common/thehive/types';
import { severityOptions, tlpOptions } from './constants';
import * as translations from './translations';

export const TheHiveParamsAlertFields: React.FC<ActionParamsProps<ExecutorParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  executionMode,
}) => {
  const alert = useMemo(
    () =>
      (actionParams.subActionParams as ExecutorSubActionCreateAlertParams) ??
      ({
        tlp: 2,
        severity: 2,
        tags: [],
      } as unknown as ExecutorSubActionCreateAlertParams),
    [actionParams.subActionParams]
  );
  const isTest = executionMode === ActionConnectorMode.Test;

  const [severity, setSeverity] = useState(alert.severity ?? severityOptions[1].value);
  const [tlp, setTlp] = useState(alert.tlp ?? tlpOptions[2].value);
  const [selectedOptions, setSelected] = useState<Array<{ label: string }>>(
    alert.tags?.map((tag) => ({ label: tag })) ?? []
  );
  const [isRuleSeverity, setIsRuleSeverity] = useState<boolean>(Boolean(alert.isRuleSeverity));

  const onCreateOption = (searchValue: string) => {
    setSelected([...selectedOptions, { label: searchValue }]);
    editAction('subActionParams', { ...alert, tags: [...(alert.tags ?? []), searchValue] }, index);
  };

  const onChange = (selectedOptionList: Array<{ label: string }>) => {
    setSelected(selectedOptionList);
    editAction(
      'subActionParams',
      { ...alert, tags: selectedOptionList.map((option) => option.label) },
      index
    );
  };

  return (
    <>
      <TextFieldWithMessageVariables
        index={index}
        editAction={(key, value) => {
          editAction('subActionParams', { ...alert, [key]: value }, index);
        }}
        messageVariables={messageVariables}
        paramsProperty={'title'}
        inputTargetValue={alert.title ?? undefined}
        wrapField={true}
        formRowProps={{
          label: translations.TITLE_LABEL,
          fullWidth: true,
          helpText: '',
          isInvalid:
            errors['createAlertParam.title'] !== undefined &&
            Number(errors['createAlertParam.title'].length) > 0 &&
            alert.title !== undefined,
          error: errors['createAlertParam.title'] as string,
        }}
        errors={errors['createAlertParam.title'] as string[]}
      />
      <TextAreaWithMessageVariables
        index={index}
        label={translations.DESCRIPTION_LABEL}
        editAction={(key, value) => {
          editAction('subActionParams', { ...alert, [key]: value }, index);
        }}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={alert.description ?? undefined}
        errors={errors['createAlertParam.description'] as string[]}
      />
      <TextFieldWithMessageVariables
        index={index}
        editAction={(key, value) => {
          editAction('subActionParams', { ...alert, [key]: value }, index);
        }}
        paramsProperty={'type'}
        inputTargetValue={alert.type ?? undefined}
        wrapField={true}
        formRowProps={{
          label: translations.TYPE_LABEL,
          fullWidth: true,
          helpText: '',
          isInvalid:
            errors['createAlertParam.type'] !== undefined &&
            Number(errors['createAlertParam.type'].length) > 0 &&
            alert.type !== undefined,
          error: errors['createAlertParam.type'] as string,
        }}
        errors={errors['createAlertParam.type'] as string[]}
      />
      <TextFieldWithMessageVariables
        index={index}
        editAction={(key, value) => {
          editAction('subActionParams', { ...alert, [key]: value }, index);
        }}
        paramsProperty={'source'}
        inputTargetValue={alert.source ?? undefined}
        wrapField={true}
        formRowProps={{
          label: translations.SOURCE_LABEL,
          fullWidth: true,
          helpText: '',
          isInvalid:
            errors['createAlertParam.source'] !== undefined &&
            Number(errors['createAlertParam.source'].length) > 0 &&
            alert.source !== undefined,
          error: errors['createAlertParam.source'] as string,
        }}
        errors={errors['createAlertParam.source'] as string[]}
      />
      <TextFieldWithMessageVariables
        index={index}
        editAction={(key, value) => {
          editAction('subActionParams', { ...alert, [key]: value }, index);
        }}
        messageVariables={messageVariables}
        paramsProperty={'sourceRef'}
        inputTargetValue={alert.sourceRef ?? undefined}
        wrapField={true}
        formRowProps={{
          label: translations.SOURCE_REF_LABEL,
          fullWidth: true,
          helpText: '',
          isInvalid:
            errors['createAlertParam.sourceRef'] !== undefined &&
            Number(errors['createAlertParam.sourceRef'].length) > 0 &&
            alert.sourceRef !== undefined,
          error: errors['createAlertParam.sourceRef'] as string,
        }}
        errors={errors['createAlertParam.sourceRef'] as string[]}
      />
      {!isTest && (
        <EuiFormRow fullWidth>
          <EuiSwitch
            label={translations.IS_RULE_SEVERITY_LABEL}
            checked={Boolean(isRuleSeverity)}
            compressed={true}
            data-test-subj="rule-severity-toggle"
            onChange={(e) => {
              setIsRuleSeverity(e.target.checked);
              editAction(
                'subActionParams',
                {
                  ...alert,
                  isRuleSeverity: e.target.checked,
                },
                index
              );
            }}
          />
        </EuiFormRow>
      )}
      {!Boolean(isRuleSeverity) && (
        <EuiFormRow fullWidth label={translations.SEVERITY_LABEL}>
          <EuiSelect
            fullWidth
            data-test-subj="severitySelectInput"
            disabled={isRuleSeverity}
            value={severity}
            options={severityOptions}
            onChange={(e) => {
              editAction(
                'subActionParams',
                { ...alert, severity: parseInt(e.target.value, 10) },
                index
              );
              setSeverity(parseInt(e.target.value, 10));
            }}
          />
        </EuiFormRow>
      )}
      <EuiFormRow fullWidth label={translations.TLP_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="tlpSelectInput"
          value={tlp}
          options={tlpOptions}
          onChange={(e) => {
            editAction('subActionParams', { ...alert, tlp: parseInt(e.target.value, 10) }, index);
            setTlp(parseInt(e.target.value, 10));
          }}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={translations.TAGS_LABEL}>
        <EuiComboBox
          data-test-subj="tagsInput"
          fullWidth
          selectedOptions={selectedOptions}
          onCreateOption={onCreateOption}
          onChange={onChange}
          noSuggestions
        />
      </EuiFormRow>
      <JsonEditorWithMessageVariables
        messageVariables={messageVariables}
        paramsProperty={'body'}
        inputTargetValue={alert.body}
        label={translations.BODY_LABEL}
        ariaLabel={translations.BODY_DESCRIPTION}
        errors={errors.body as string[]}
        onDocumentsChange={(json: string) =>
          editAction('subActionParams', { ...alert, body: json }, index)
        }
        dataTestSubj="thehive-body"
        onBlur={() => {
          if (!alert.body) {
            editAction('subActionParams', { ...alert, body: null }, index);
          }
        }}
        isOptionalField
      />
    </>
  );
};
