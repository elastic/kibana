/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  TextFieldWithMessageVariables,
  TextAreaWithMessageVariables,
  ActionParamsProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect, EuiComboBox } from '@elastic/eui';
import { ExecutorParams, ExecutorSubActionPushParams } from '../../../common/thehive/types';
import { severityOptions, tlpOptions } from './constants';
import * as translations from './translations';
import { OptionalFieldLabel } from '../../common/optional_field_label';

export const TheHiveParamsCaseFields: React.FC<ActionParamsProps<ExecutorParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
}) => {
  const { incident, comments } = useMemo(
    () =>
      (actionParams.subActionParams as ExecutorSubActionPushParams) ??
      ({
        incident: {
          tlp: 2,
          severity: 2,
          tags: [],
        },
        comments: [],
      } as unknown as ExecutorSubActionPushParams),
    [actionParams.subActionParams]
  );

  const [severity, setSeverity] = useState(incident.severity ?? severityOptions[1].value);
  const [tlp, setTlp] = useState(incident.tlp ?? tlpOptions[2].value);
  const [selectedOptions, setSelected] = useState<Array<{ label: string }>>(
    incident.tags?.map((tag) => ({ label: tag })) ?? []
  );

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps =
        key !== 'comments'
          ? {
              incident: { ...incident, [key]: value },
              comments,
            }
          : { incident, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [comments, editAction, incident, index]
  );

  const editComment = useCallback(
    (key: string, value: any) => {
      editSubActionProperty(key, [{ commentId: '1', comment: value }]);
    },
    [editSubActionProperty]
  );

  const onCreateOption = (searchValue: string) => {
    setSelected([...selectedOptions, { label: searchValue }]);
    editSubActionProperty('tags', [...(incident.tags ?? []), searchValue]);
  };

  const onChange = (selectedOptionList: Array<{ label: string }>) => {
    setSelected(selectedOptionList);
    editSubActionProperty(
      'tags',
      selectedOptionList.map((option) => option.label)
    );
  };

  return (
    <>
      <TextFieldWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'title'}
        inputTargetValue={incident.title ?? undefined}
        wrapField={true}
        formRowProps={{
          label: translations.TITLE_LABEL,
          fullWidth: true,
          helpText: '',
          isInvalid:
            errors['pushToServiceParam.incident.title'] !== undefined &&
            Number(errors['pushToServiceParam.incident.title'].length) > 0 &&
            incident.title !== undefined,
          error: errors['pushToServiceParam.incident.title'] as string,
        }}
        errors={errors['pushToServiceParam.incident.title'] as string[]}
      />
      <TextAreaWithMessageVariables
        index={index}
        label={translations.DESCRIPTION_LABEL}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={incident.description ?? undefined}
        errors={errors['pushToServiceParam.incident.description'] as string[]}
      />
      <EuiFormRow fullWidth error={errors.severity as string} label={translations.SEVERITY_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="severitySelectInput"
          value={severity}
          options={severityOptions}
          onChange={(e) => {
            editSubActionProperty('severity', parseInt(e.target.value, 10));
            setSeverity(parseInt(e.target.value, 10));
          }}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth error={errors.tlp as string} label={translations.TLP_LABEL}>
        <EuiSelect
          fullWidth
          value={tlp}
          data-test-subj="tlpSelectInput"
          options={tlpOptions}
          onChange={(e) => {
            editSubActionProperty('tlp', parseInt(e.target.value, 10));
            setTlp(parseInt(e.target.value, 10));
          }}
        />
      </EuiFormRow>

      <EuiFormRow fullWidth label={translations.TAGS_LABEL} labelAppend={OptionalFieldLabel}>
        <EuiComboBox
          data-test-subj="tagsInput"
          fullWidth
          selectedOptions={selectedOptions}
          onCreateOption={onCreateOption}
          onChange={onChange}
          noSuggestions
        />
      </EuiFormRow>

      <TextAreaWithMessageVariables
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        label={translations.COMMENTS_LABEL}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        isOptionalField
      />
    </>
  );
};
