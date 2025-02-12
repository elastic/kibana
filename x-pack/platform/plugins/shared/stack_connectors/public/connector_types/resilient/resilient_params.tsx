/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiComboBoxOptionOption,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ResilientActionParams } from './types';

import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import { OptionalFieldLabel } from '../../common/optional_field_label';

const ResilientParamsFields: React.FunctionComponent<ActionParamsProps<ResilientActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as ResilientActionParams['subActionParams']),
    [actionParams.subActionParams]
  );
  const { isLoading: isLoadingIncidentTypes, incidentTypes: allIncidentTypes } =
    useGetIncidentTypes({
      http,
      toastNotifications: toasts,
      actionConnector,
    });

  const { isLoading: isLoadingSeverity, severity } = useGetSeverity({
    http,
    toastNotifications: toasts,
    actionConnector,
  });
  const severitySelectOptions: EuiSelectOption[] = useMemo(() => {
    return severity.map((s) => ({
      value: s.id.toString(),
      text: s.name,
    }));
  }, [severity]);

  const incidentTypesComboBoxOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      allIncidentTypes
        ? allIncidentTypes.map((type: { id: number; name: string }) => ({
            label: type.name,
            value: type.id.toString(),
          }))
        : [],
    [allIncidentTypes]
  );
  const selectedIncidentTypesComboBoxOptions: Array<EuiComboBoxOptionOption<string>> =
    useMemo(() => {
      const allIncidentTypesAsObject = allIncidentTypes.reduce(
        (acc, type) => ({ ...acc, [type.id.toString()]: type.name }),
        {} as Record<string, string>
      );
      return incident.incidentTypes
        ? incident.incidentTypes
            .map((type) => ({
              label: allIncidentTypesAsObject[type.toString()],
              value: type.toString(),
            }))
            .filter((type) => type.label != null)
        : [];
    }, [allIncidentTypes, incident.incidentTypes]);

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
    (key: string, value: string) => {
      editSubActionProperty(key, [{ commentId: '1', comment: value }]);
    },
    [editSubActionProperty]
  );

  const incidentTypesOnChange = useCallback(
    (selectedOptions: Array<{ label: string; value?: string }>) => {
      editSubActionProperty(
        'incidentTypes',
        selectedOptions.map((selectedOption) => selectedOption.value ?? selectedOption.label)
      );
    },
    [editSubActionProperty]
  );
  const incidentTypesOnBlur = useCallback(() => {
    if (!incident.incidentTypes) {
      editSubActionProperty('incidentTypes', []);
    }
  }, [editSubActionProperty, incident.incidentTypes]);

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  return (
    <>
      <EuiTitle size="s">
        <h3>Incident</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.stackConnectors.components.resilient.urgencySelectFieldLabel',
          { defaultMessage: 'Incident type' }
        )}
        labelAppend={OptionalFieldLabel}
      >
        <EuiComboBox
          fullWidth
          isLoading={isLoadingIncidentTypes}
          isDisabled={isLoadingIncidentTypes}
          data-test-subj="incidentTypeComboBox"
          options={incidentTypesComboBoxOptions}
          selectedOptions={selectedIncidentTypesComboBoxOptions}
          onChange={incidentTypesOnChange}
          onBlur={incidentTypesOnBlur}
          isClearable={true}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.stackConnectors.components.resilient.severity', {
          defaultMessage: 'Severity',
        })}
        labelAppend={OptionalFieldLabel}
      >
        <EuiSelect
          data-test-subj="severitySelect"
          disabled={isLoadingSeverity}
          fullWidth
          hasNoInitialSelection
          isLoading={isLoadingSeverity}
          onChange={(e) => editSubActionProperty('severityCode', e.target.value)}
          options={severitySelectOptions}
          value={incident.severityCode ?? undefined}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors['subActionParams.incident.name'] as string[]}
        isInvalid={
          errors['subActionParams.incident.name'] !== undefined &&
          Number(errors['subActionParams.incident.name'].length) > 0 &&
          incident.name !== undefined
        }
        label={i18n.translate('xpack.stackConnectors.components.resilient.nameFieldLabel', {
          defaultMessage: 'Name',
        })}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'name'}
          inputTargetValue={incident.name ?? undefined}
          errors={(errors['subActionParams.incident.name'] ?? []) as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        label={i18n.translate(
          'xpack.stackConnectors.components.resilient.descriptionTextAreaFieldLabel',
          { defaultMessage: 'Description' }
        )}
        inputTargetValue={incident.description ?? undefined}
        isOptionalField
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        label={i18n.translate(
          'xpack.stackConnectors.components.resilient.commentsTextAreaFieldLabel',
          { defaultMessage: 'Additional comments' }
        )}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        isOptionalField
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ResilientParamsFields as default };
