/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionConnectorMode, ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import { Choice, Fields } from '../lib/servicenow/types';
import { ServiceNowITSMActionParams, EventAction } from './types';
import { useGetChoices } from '../lib/servicenow/use_get_choices';
import { OptionalFieldLabel } from '../../common/optional_field_label';
import {
  ACTION_GROUP_RECOVERED,
  choicesToEuiOptions,
  DEFAULT_CORRELATION_ID,
} from '../lib/servicenow/helpers';

import * as i18n from '../lib/servicenow/translations';
import { AdditionalFields } from '../lib/servicenow/additional_fields';

const useGetChoicesFields = ['urgency', 'severity', 'impact', 'category', 'subcategory'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  urgency: [],
  severity: [],
  impact: [],
  priority: [],
};

const CorrelationIdField: React.FunctionComponent<
  Pick<ActionParamsProps<ServiceNowITSMActionParams>, 'index' | 'messageVariables' | 'errors'> & {
    correlationId: string | null;
    editSubActionProperty: (key: string, value: any) => void;
    isRequired?: boolean;
  }
> = ({ index, messageVariables, correlationId, editSubActionProperty, isRequired, errors }) => {
  const { docLinks } = useKibana().services;
  return (
    <EuiFormRow
      fullWidth
      label={i18n.CORRELATION_ID}
      error={errors['subActionParams.incident.correlation_id'] as string}
      isInvalid={
        errors['subActionParams.incident.correlation_id'] !== undefined &&
        Number(errors['subActionParams.incident.correlation_id'].length) > 0 &&
        !correlationId &&
        isRequired
      }
      helpText={
        <EuiLink href={docLinks.links.alerting.serviceNowAction} target="_blank">
          <FormattedMessage
            id="xpack.stackConnectors.components.serviceNow.correlationIDHelpLabel"
            defaultMessage="Identifier for updating incidents"
          />
        </EuiLink>
      }
      labelAppend={
        <EuiText size="xs" color="subdued">
          {isRequired ? i18n.REQUIRED_LABEL : i18n.OPTIONAL_LABEL}
        </EuiText>
      }
    >
      <TextFieldWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'correlation_id'}
        inputTargetValue={correlationId ?? undefined}
        errors={errors['subActionParams.incident.correlation_id'] as string[]}
      />
    </EuiFormRow>
  );
};

const eventActionOptions = [
  {
    value: EventAction.TRIGGER,
    text: i18n.EVENT_ACTION_TRIGGER,
  },
  {
    value: EventAction.RESOLVE,
    text: i18n.EVENT_ACTION_RESOLVE,
  },
];

const ServiceNowParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowITSMActionParams>
> = (props) => {
  const {
    executionMode,
    actionConnector,
    actionParams,
    editAction,
    index,
    errors,
    messageVariables,
    selectedActionGroupId,
  } = props;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const isDeprecatedActionConnector = actionConnector?.isDeprecated;
  const [choices, setChoices] = useState<Fields>(defaultFields);
  const [eventAction, setEventAction] = useState<EventAction>(EventAction.TRIGGER);

  const isTestTriggerAction =
    executionMode === ActionConnectorMode.Test && eventAction === EventAction.TRIGGER;
  const isTestResolveAction =
    executionMode === ActionConnectorMode.Test && eventAction === EventAction.RESOLVE;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');

  const showOnlyCorrelationId =
    (selectedActionGroupId && selectedActionGroupId === ACTION_GROUP_RECOVERED) ||
    isTestResolveAction;

  if (isTestTriggerAction && !actionParams.subAction) {
    editAction('subAction', 'pushToService', index);
  }

  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments:
          selectedActionGroupId && selectedActionGroupId !== ACTION_GROUP_RECOVERED
            ? []
            : undefined,
      } as unknown as ServiceNowITSMActionParams['subActionParams']),
    [actionParams.subActionParams, selectedActionGroupId]
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

  const categoryOptions = useMemo(() => choicesToEuiOptions(choices.category), [choices.category]);
  const urgencyOptions = useMemo(() => choicesToEuiOptions(choices.urgency), [choices.urgency]);
  const severityOptions = useMemo(() => choicesToEuiOptions(choices.severity), [choices.severity]);
  const impactOptions = useMemo(() => choicesToEuiOptions(choices.impact), [choices.impact]);

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choices.subcategory.filter(
          (subcategory) => subcategory.dependent_value === incident.category
        )
      ),
    [choices.subcategory, incident.category]
  );

  const { isLoading: isLoadingChoices } = useGetChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    fields: useGetChoicesFields,
    onSuccess: onChoicesSuccess,
  });

  const handleEventActionChange = useCallback(
    (value: EventAction) => {
      if (!value) {
        return;
      }

      setEventAction(value);

      if (value === EventAction.RESOLVE) {
        editAction('subAction', 'closeIncident', index);
        return;
      }

      editAction('subAction', 'pushToService', index);
    },
    [setEventAction, editAction, index]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      if (selectedActionGroupId === ACTION_GROUP_RECOVERED) {
        editAction(
          'subActionParams',
          { incident: { correlation_id: DEFAULT_CORRELATION_ID } },
          index
        );

        return;
      }

      editAction(
        'subActionParams',
        {
          incident: { correlation_id: DEFAULT_CORRELATION_ID },
          comments: [],
        },
        index
      );
    }

    if (
      (isTestResolveAction || isTestTriggerAction) &&
      (!isEmpty(actionParams.subActionParams?.incident) ||
        actionParams.subActionParams?.comments?.length)
    ) {
      editAction('subActionParams', { incident: {}, comments: undefined }, index);
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector, isTestResolveAction, isTestTriggerAction]);

  const additionalFieldsOnChange = useCallback(
    (value: string | null) => editSubActionProperty('additional_fields', value),
    [editSubActionProperty]
  );

  return (
    <>
      {executionMode === ActionConnectorMode.Test ? (
        <EuiFormRow fullWidth label={i18n.EVENT_ACTION_LABEL}>
          <EuiSelect
            fullWidth
            data-test-subj="eventActionSelect"
            options={eventActionOptions}
            value={eventAction}
            onChange={(e) => handleEventActionChange(e.target.value as EventAction)}
          />
        </EuiFormRow>
      ) : null}
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>{i18n.INCIDENT}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {showOnlyCorrelationId ? (
        <CorrelationIdField
          index={index}
          messageVariables={messageVariables}
          correlationId={incident.correlation_id}
          editSubActionProperty={editSubActionProperty}
          isRequired={showOnlyCorrelationId}
          errors={errors}
        />
      ) : (
        <>
          <EuiFormRow fullWidth label={i18n.URGENCY_LABEL} labelAppend={OptionalFieldLabel}>
            <EuiSelect
              fullWidth
              data-test-subj="urgencySelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={urgencyOptions}
              value={incident.urgency ?? ''}
              onChange={(e) => editSubActionProperty('urgency', e.target.value)}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={i18n.SEVERITY_LABEL} labelAppend={OptionalFieldLabel}>
                <EuiSelect
                  fullWidth
                  data-test-subj="severitySelect"
                  hasNoInitialSelection
                  isLoading={isLoadingChoices}
                  disabled={isLoadingChoices}
                  options={severityOptions}
                  value={incident.severity ?? ''}
                  onChange={(e) => editSubActionProperty('severity', e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={i18n.IMPACT_LABEL} labelAppend={OptionalFieldLabel}>
                <EuiSelect
                  fullWidth
                  data-test-subj="impactSelect"
                  hasNoInitialSelection
                  isLoading={isLoadingChoices}
                  disabled={isLoadingChoices}
                  options={impactOptions}
                  value={incident.impact ?? ''}
                  onChange={(e) => editSubActionProperty('impact', e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
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
                <EuiFormRow
                  fullWidth
                  label={i18n.SUBCATEGORY_LABEL}
                  labelAppend={OptionalFieldLabel}
                >
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
                  <CorrelationIdField
                    index={index}
                    messageVariables={messageVariables}
                    correlationId={incident.correlation_id}
                    editSubActionProperty={editSubActionProperty}
                    isRequired={showOnlyCorrelationId}
                    errors={errors}
                  />
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
          <EuiFlexGroup>
            <EuiFlexItem>
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
                  inputTargetValue={incident?.short_description ?? undefined}
                  errors={errors['subActionParams.incident.short_description'] as string[]}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
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
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
