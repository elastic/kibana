/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';

import * as i18n from '../lib/servicenow/translations';
import { useGetChoices } from '../lib/servicenow/use_get_choices';
import { ServiceNowSIRActionParams } from './types';
import { Fields, Choice } from '../lib/servicenow/types';
import { choicesToEuiOptions, DEFAULT_CORRELATION_ID } from '../lib/servicenow/helpers';
import { DeprecatedCallout } from '../lib/servicenow/deprecated_callout';
import { AdditionalFields } from '../lib/servicenow/additional_fields';
import { OptionalFieldLabel } from '../../common/optional_field_label';

const useGetChoicesFields = ['category', 'subcategory', 'priority'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  priority: [],
};

const ServiceNowSIRParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowSIRActionParams>
> = ({ actionConnector, actionParams, editAction, index, errors, messageVariables }) => {
  const {
    docLinks,
    http,
    notifications: { toasts },
  } = useKibana().services;

  const isDeprecatedActionConnector = actionConnector?.isDeprecated;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as ServiceNowSIRActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const [choices, setChoices] = useState<Fields>(defaultFields);

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

  const onChoicesSuccess = useCallback((values: Choice[]) => {
    setChoices(
      values.reduce(
        (acc, value) => ({
          ...acc,
          [value.element]: [...(acc[value.element] != null ? acc[value.element] : []), value],
        }),
        defaultFields
      )
    );
  }, []);

  const { isLoading: isLoadingChoices } = useGetChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    // Not having a memoized fields variable will cause infinitive API calls.
    fields: useGetChoicesFields,
    onSuccess: onChoicesSuccess,
  });

  const categoryOptions = useMemo(() => choicesToEuiOptions(choices.category), [choices.category]);
  const priorityOptions = useMemo(() => choicesToEuiOptions(choices.priority), [choices.priority]);

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choices.subcategory.filter(
          (subcategory) => subcategory.dependent_value === incident.category
        )
      ),
    [choices.subcategory, incident.category]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: { correlation_id: DEFAULT_CORRELATION_ID },
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
          incident: { correlation_id: DEFAULT_CORRELATION_ID },
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  const additionalFieldsOnChange = useCallback(
    (value: string | null) => editSubActionProperty('additional_fields', value),
    [editSubActionProperty]
  );

  return (
    <>
      {isDeprecatedActionConnector && <DeprecatedCallout />}
      <EuiTitle size="s">
        <h3>{i18n.SECURITY_INCIDENT}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors['subActionParams.incident.short_description'] as string[]}
        isInvalid={
          errors['subActionParams.incident.short_description'] !== undefined &&
          Number(errors['subActionParams.incident.short_description'].length) > 0 &&
          incident.short_description !== undefined
        }
        label={i18n.SHORT_DESCRIPTION_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'short_description'}
          inputTargetValue={incident?.short_description}
          errors={errors['subActionParams.incident.short_description'] as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.PRIORITY_LABEL} labelAppend={OptionalFieldLabel}>
        <EuiSelect
          fullWidth
          data-test-subj="prioritySelect"
          hasNoInitialSelection
          isLoading={isLoadingChoices}
          disabled={isLoadingChoices}
          options={priorityOptions}
          value={incident.priority ?? undefined}
          onChange={(e) => editSubActionProperty('priority', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.CATEGORY_LABEL} labelAppend={OptionalFieldLabel}>
            <EuiSelect
              fullWidth
              data-test-subj="categorySelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={categoryOptions}
              value={incident.category ?? undefined}
              onChange={(e) => {
                editAction(
                  'subActionParams',
                  {
                    incident: { ...incident, category: e.target.value, subcategory: null },
                    comments,
                  },
                  index
                );
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          {subcategoryOptions?.length > 0 ? (
            <EuiFormRow fullWidth label={i18n.SUBCATEGORY_LABEL} labelAppend={OptionalFieldLabel}>
              <EuiSelect
                fullWidth
                data-test-subj="subcategorySelect"
                hasNoInitialSelection
                isLoading={isLoadingChoices}
                disabled={isLoadingChoices}
                options={subcategoryOptions}
                // Needs an empty string instead of undefined to select the blank option when changing categories
                value={incident.subcategory ?? ''}
                onChange={(e) => editSubActionProperty('subcategory', e.target.value)}
              />
            </EuiFormRow>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {!isDeprecatedActionConnector && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.CORRELATION_ID}
                labelAppend={OptionalFieldLabel}
                helpText={
                  <EuiLink href={docLinks.links.alerting.serviceNowSIRAction} target="_blank">
                    <FormattedMessage
                      id="xpack.stackConnectors.components.serviceNowSIR.correlationIDHelpLabel"
                      defaultMessage="Identifier for updating incidents"
                    />
                  </EuiLink>
                }
              >
                <TextFieldWithMessageVariables
                  index={index}
                  editAction={editSubActionProperty}
                  messageVariables={messageVariables}
                  paramsProperty={'correlation_id'}
                  inputTargetValue={incident?.correlation_id ?? undefined}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.CORRELATION_DISPLAY}
                labelAppend={OptionalFieldLabel}
              >
                <TextFieldWithMessageVariables
                  index={index}
                  editAction={editSubActionProperty}
                  messageVariables={messageVariables}
                  paramsProperty={'correlation_display'}
                  inputTargetValue={incident?.correlation_display ?? undefined}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={incident.description ?? undefined}
        label={i18n.DESCRIPTION_LABEL}
        isOptionalField
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        label={i18n.COMMENTS_LABEL}
        isOptionalField
      />
      <EuiSpacer size="m" />
      {!isDeprecatedActionConnector && (
        <AdditionalFields
          value={actionParams.subActionParams?.incident.additional_fields}
          messageVariables={messageVariables}
          errors={errors['subActionParams.incident.additional_fields'] as string[]}
          onChange={additionalFieldsOnChange}
          isOptionalField
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowSIRParamsFields as default };
