/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EVENT_RESOLVE,
  EVENT_TRIGGER,
  MATCH_ON_CATALOG,
  MATCH_ON_CUSTOM,
  MATCH_ON_FUNCTIONALITY,
  MATCH_ON_SERVICE,
  MATCH_ON_TEAM,
  TARGET_TYPE_ESCALATION_POLICY,
  TARGET_TYPE_FUNCTIONALITY,
  TARGET_TYPE_SERVICE,
  TARGET_TYPE_TEAM,
  TARGET_TYPE_USER,
} from '@kbn/connector-schemas/rootly_alerts/constants';
import type { PagingTarget, RoutingMatch } from '@kbn/connector-schemas/rootly_alerts';
import { getDedupKey, getEventBody } from '../../../common/rootly_alerts/event_body';
import { LabelsEditor } from './labels_editor';
import type { RootlyAlertsActionParams } from './types';
import * as i18n from './translations';

const eventOptions = [
  { value: EVENT_TRIGGER, text: i18n.EVENT_TRIGGER_OPTION },
  { value: EVENT_RESOLVE, text: i18n.EVENT_RESOLVE_OPTION },
];

const routingFieldOptions = [
  { value: MATCH_ON_SERVICE, text: i18n.MATCH_ON_SERVICE_OPTION },
  { value: MATCH_ON_TEAM, text: i18n.MATCH_ON_TEAM_OPTION },
  { value: MATCH_ON_FUNCTIONALITY, text: i18n.MATCH_ON_FUNCTIONALITY_OPTION },
  { value: MATCH_ON_CATALOG, text: i18n.MATCH_ON_CATALOG_OPTION },
  { value: MATCH_ON_CUSTOM, text: i18n.MATCH_ON_CUSTOM_OPTION },
];

const targetTypeOptions = [
  { value: TARGET_TYPE_SERVICE, text: i18n.TARGET_TYPE_SERVICE_OPTION },
  { value: TARGET_TYPE_TEAM, text: i18n.TARGET_TYPE_TEAM_OPTION },
  { value: TARGET_TYPE_ESCALATION_POLICY, text: i18n.TARGET_TYPE_ESCALATION_POLICY_OPTION },
  { value: TARGET_TYPE_USER, text: i18n.TARGET_TYPE_USER_OPTION },
  { value: TARGET_TYPE_FUNCTIONALITY, text: i18n.TARGET_TYPE_FUNCTIONALITY_OPTION },
];

const targetIdLabels: Record<PagingTarget['type'], string> = {
  [TARGET_TYPE_SERVICE]: i18n.TARGET_ID_SERVICE_LABEL,
  [TARGET_TYPE_TEAM]: i18n.TARGET_ID_TEAM_LABEL,
  [TARGET_TYPE_ESCALATION_POLICY]: i18n.TARGET_ID_ESCALATION_POLICY_LABEL,
  [TARGET_TYPE_USER]: i18n.TARGET_ID_USER_LABEL,
  [TARGET_TYPE_FUNCTIONALITY]: i18n.TARGET_ID_FUNCTIONALITY_LABEL,
};

const optionalLabel = (
  <EuiText size="xs" color="subdued">
    {i18n.OPTIONAL_LABEL}
  </EuiText>
);

const getPreview = (actionParams: RootlyAlertsActionParams): string => {
  try {
    const dedupKey = getDedupKey(actionParams) ?? i18n.PREVIEW_GENERATED_DEDUP_KEY;
    return JSON.stringify(getEventBody({ ...actionParams, dedupKey }), null, 2);
  } catch {
    return i18n.PREVIEW_INVALID;
  }
};

export const RootlyAlertsParamsFields: React.FunctionComponent<
  ActionParamsProps<RootlyAlertsActionParams>
> = ({ actionParams, editAction, index, errors, messageVariables }) => {
  const {
    event = EVENT_TRIGGER,
    dedupKey,
    title,
    description,
    url,
    urgency,
    target,
    labels,
  } = actionParams;
  const isTrigger = event === EVENT_TRIGGER;
  const match: RoutingMatch = actionParams.match ?? { on: MATCH_ON_SERVICE };

  // The rule form keeps only the last edit of an interaction, so the match and the target are
  // always edited whole. The match is kept while a target is set, and is not sent.
  const editMatch = (changes: Partial<RoutingMatch>) =>
    editAction('match', { ...match, ...changes }, index);
  const editTarget = (changes: Partial<PagingTarget>) =>
    editAction('target', { ...target, ...changes }, index);

  const pagingRoutesId = `rootlyAlertsPagingRoutes-${index}`;
  const pagingTargetId = `rootlyAlertsPagingTarget-${index}`;

  const dedupKeyErrors = (errors.dedupKey ?? []) as string[];
  const titleErrors = (errors.title ?? []) as string[];
  const matchErrors = (errors.match ?? []) as string[];
  const targetErrors = (errors.target ?? []) as string[];
  const labelErrors = (errors.labels ?? []) as string[];
  const customDetailsErrors = (errors.customDetails ?? []) as string[];

  return (
    <>
      <EuiFormRow fullWidth label={i18n.EVENT_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="rootlyAlertsEventSelect"
          options={eventOptions}
          value={event}
          onChange={(e) => editAction('event', e.target.value, index)}
        />
      </EuiFormRow>
      {isTrigger && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.TITLE_LABEL}
            error={titleErrors}
            isInvalid={titleErrors.length > 0 && title !== undefined}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'title'}
              aria-label={i18n.TITLE_LABEL}
              inputTargetValue={title}
              errors={titleErrors}
            />
          </EuiFormRow>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.DEDUP_KEY_LABEL}
        labelAppend={isTrigger ? optionalLabel : null}
        helpText={isTrigger ? i18n.DEDUP_KEY_TRIGGER_HELP : i18n.DEDUP_KEY_RESOLVE_HELP}
        error={dedupKeyErrors}
        isInvalid={dedupKeyErrors.length > 0}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'dedupKey'}
          aria-label={i18n.DEDUP_KEY_LABEL}
          inputTargetValue={dedupKey}
          errors={dedupKeyErrors}
        />
      </EuiFormRow>
      {isTrigger && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h4>{i18n.PAGING_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiRadioGroup
            name={`rootlyAlertsPaging-${index}`}
            data-test-subj="rootlyAlertsPagingRadioGroup"
            options={[
              { id: pagingRoutesId, label: i18n.PAGING_ROUTES_OPTION },
              { id: pagingTargetId, label: i18n.PAGING_TARGET_OPTION },
            ]}
            idSelected={target ? pagingTargetId : pagingRoutesId}
            onChange={(id) =>
              editAction(
                'target',
                id === pagingTargetId ? { type: TARGET_TYPE_SERVICE } : undefined,
                index
              )
            }
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {target ? i18n.PAGING_TARGET_DESCRIPTION : i18n.PAGING_ROUTES_DESCRIPTION}
          </EuiText>
          <EuiSpacer size="s" />
          {target ? (
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={2}>
                <EuiFormRow fullWidth label={i18n.TARGET_TYPE_LABEL}>
                  <EuiSelect
                    fullWidth
                    data-test-subj="rootlyAlertsTargetTypeSelect"
                    options={targetTypeOptions}
                    value={target.type}
                    onChange={(e) =>
                      editAction('target', { type: e.target.value as PagingTarget['type'] }, index)
                    }
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <EuiFormRow
                  fullWidth
                  label={targetIdLabels[target.type]}
                  error={targetErrors}
                  isInvalid={targetErrors.length > 0 && target.id !== undefined}
                >
                  <TextFieldWithMessageVariables
                    key={target.type}
                    index={index}
                    editAction={(_property: string, value: string) => editTarget({ id: value })}
                    messageVariables={messageVariables}
                    paramsProperty={'targetId'}
                    aria-label={targetIdLabels[target.type]}
                    inputTargetValue={target.id}
                    errors={targetErrors}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <>
              <EuiFormRow fullWidth label={i18n.ROUTING_FIELD_LABEL}>
                <EuiSelect
                  fullWidth
                  data-test-subj="rootlyAlertsRoutingFieldSelect"
                  options={routingFieldOptions}
                  value={match.on}
                  onChange={(e) =>
                    editAction('match', { on: e.target.value as RoutingMatch['on'] }, index)
                  }
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="m">
                {match.on === MATCH_ON_CATALOG && (
                  <EuiFlexItem>
                    <EuiFormRow
                      fullWidth
                      label={i18n.CATALOG_LABEL}
                      helpText={i18n.CATALOG_HELP}
                      error={matchErrors}
                      isInvalid={matchErrors.length > 0}
                    >
                      <EuiFieldText
                        fullWidth
                        isInvalid={matchErrors.length > 0}
                        data-test-subj="rootlyAlertsCatalogInput"
                        value={match.catalog ?? ''}
                        onChange={(e) => editMatch({ catalog: e.target.value })}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.ROUTING_VALUE_LABEL}
                    labelAppend={optionalLabel}
                    helpText={
                      match.on === MATCH_ON_CUSTOM
                        ? i18n.ROUTING_VALUE_CUSTOM_HELP
                        : i18n.ROUTING_VALUE_HELP
                    }
                  >
                    <TextFieldWithMessageVariables
                      key={match.on}
                      index={index}
                      editAction={(_property: string, value: string) => editMatch({ value })}
                      messageVariables={messageVariables}
                      paramsProperty={'routingValue'}
                      aria-label={i18n.ROUTING_VALUE_LABEL}
                      inputTargetValue={match.value}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
          <EuiSpacer size="l" />
          <TextAreaWithMessageVariables
            index={index}
            editAction={editAction}
            messageVariables={messageVariables}
            paramsProperty={'description'}
            inputTargetValue={description}
            label={i18n.DESCRIPTION_LABEL}
            isOptionalField
          />
          <EuiSpacer size="m" />
          <EuiFormRow fullWidth label={i18n.LINK_LABEL} labelAppend={optionalLabel}>
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'url'}
              aria-label={i18n.LINK_LABEL}
              inputTargetValue={url}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.URGENCY_LABEL}
            labelAppend={optionalLabel}
            helpText={i18n.URGENCY_HELP}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'urgency'}
              aria-label={i18n.URGENCY_LABEL}
              inputTargetValue={urgency}
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h4>{i18n.LABELS_TITLE}</h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.LABELS_HELP}
          </EuiText>
          <EuiSpacer size="s" />
          <LabelsEditor
            labels={labels ?? []}
            onChange={(newLabels) => editAction('labels', newLabels, index)}
            index={index}
            messageVariables={messageVariables}
            errors={labelErrors}
          />
          <EuiSpacer size="m" />
          <TextAreaWithMessageVariables
            index={index}
            editAction={editAction}
            messageVariables={messageVariables}
            paramsProperty={'customDetails'}
            inputTargetValue={actionParams.customDetails}
            label={i18n.CUSTOM_DETAILS_LABEL}
            helpText={i18n.CUSTOM_DETAILS_HELP}
            errors={customDetailsErrors}
            isOptionalField
          />
        </>
      )}
      <EuiSpacer size="m" />
      <EuiAccordion
        id={`rootlyAlertsPreview-${index}`}
        data-test-subj="rootlyAlertsPreview"
        buttonContent={i18n.PREVIEW_TITLE}
        paddingSize="s"
      >
        <EuiText size="xs" color="subdued">
          {i18n.PREVIEW_HELP}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
          {getPreview(actionParams)}
        </EuiCodeBlock>
      </EuiAccordion>
    </>
  );
};
