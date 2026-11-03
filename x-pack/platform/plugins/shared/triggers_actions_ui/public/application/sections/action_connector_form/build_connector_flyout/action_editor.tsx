/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import type {
  BuildConnectorFormData,
  ConnectorTypeActionScope,
  ConnectorTypeHttpMethod,
} from './types';
import { FieldListEditor } from './field_list_editor';
import { HeaderListEditor } from './header_list_editor';
import { JsonBodyEditor } from './json_body_editor';

interface Props {
  index: number;
  onRemove: () => void;
}

const scopeOptions: Array<{ value: ConnectorTypeActionScope; text: string }> = [
  {
    value: 'read',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.scope.read', {
      defaultMessage: 'Read',
    }),
  },
  {
    value: 'write',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.scope.write', {
      defaultMessage: 'Write',
    }),
  },
  {
    value: 'destroy',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.scope.destroy', {
      defaultMessage: 'Destroy',
    }),
  },
];

const methodOptions: Array<{ value: ConnectorTypeHttpMethod; text: string }> = (
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
).map((method) => ({ value: method, text: method }));

/** Explains action input fields; shown on the info icon of each action's field list. */
const PARAMS_TOOLTIP = (
  <p>
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.buildConnectorFlyout.paramsTooltip"
      defaultMessage="The {input} object. Its fields are provided by a rule each time this action runs, for example a message, and are available in this action's request as {example}. In YAML they are listed under {yamlKey}."
      values={{
        input: <code>input</code>,
        example: <code>{'{{input.<name>}}'}</code>,
        yamlKey: <code>input</code>,
      }}
    />
  </p>
);

const PARAMS_DESCRIPTION = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.buildConnectorFlyout.paramsDescription"
    defaultMessage="Provided by a rule each time this action runs. Use as {example}."
    values={{ example: <code>{'{{input.<name>}}'}</code> }}
  />
);

const REMOVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.removeActionButtonLabel',
  { defaultMessage: 'Remove action' }
);

/** Editor for one action: identity, params, and the HTTP request it performs. */
const ActionEditorComponent: React.FC<Props> = ({ index, onRemove }) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const { errors } = useFormState({ control, name: `actions.${index}` });
  const actionErrors = errors.actions?.[index];
  const testSubj = `buildConnectorAction-${index}`;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.buildConnectorFlyout.actionTitle"
                defaultMessage="Action {number}"
                values={{ number: index + 1 }}
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={REMOVE_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="minusCircle"
              color="danger"
              aria-label={REMOVE_LABEL}
              data-test-subj={`${testSubj}-remove`}
              onClick={onRemove}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      {actionErrors?.root?.message && (
        <EuiFormErrorText data-test-subj={`${testSubj}-error`}>
          {actionErrors.root.message}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={3}>
          <Controller
            name={`actions.${index}.name`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorFlyout.actionNameLabel',
                  { defaultMessage: 'Name' }
                )}
                helpText={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorFlyout.actionNameHelpText',
                  { defaultMessage: 'Identifier a rule uses to pick this action.' }
                )}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj={`${testSubj}-name`}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <Controller
            name={`actions.${index}.scope`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorFlyout.actionScopeLabel',
                  { defaultMessage: 'Scope' }
                )}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiSelect
                  fullWidth
                  isInvalid={!!error}
                  options={scopeOptions}
                  data-test-subj={`${testSubj}-scope`}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <Controller
        name={`actions.${index}.description`}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.actionDescriptionLabel',
              { defaultMessage: 'Description' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              data-test-subj={`${testSubj}-description`}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <EuiSpacer size="m" />
      <FieldListEditor
        name={`actions.${index}.input`}
        title={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.paramsTitle', {
          defaultMessage: 'Params',
        })}
        description={PARAMS_DESCRIPTION}
        tooltipContent={PARAMS_TOOLTIP}
        addButtonLabel={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.addParamButtonLabel',
          { defaultMessage: 'Add param' }
        )}
        testSubjPrefix={`${testSubj}-input`}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.buildConnectorFlyout.requestTitle"
            defaultMessage="Request"
          />
        </h5>
      </EuiTitle>
      {actionErrors?.request?.root?.message && (
        <EuiFormErrorText data-test-subj={`${testSubj}-request-error`}>
          {actionErrors.request.root.message}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <Controller
            name={`actions.${index}.request.method`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorFlyout.methodLabel',
                  { defaultMessage: 'Method' }
                )}
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiSelect
                  isInvalid={!!error}
                  options={methodOptions}
                  data-test-subj={`${testSubj}-method`}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <Controller
            name={`actions.${index}.request.url`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorFlyout.urlLabel',
                  { defaultMessage: 'URL' }
                )}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj={`${testSubj}-url`}
                  placeholder="{{config.baseUrl}}/path"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <Controller
        name={`actions.${index}.request.path`}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.pathLabel',
              { defaultMessage: 'Path' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              data-test-subj={`${testSubj}-path`}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <EuiSpacer size="s" />
      <HeaderListEditor actionIndex={index} testSubjPrefix={`${testSubj}-headers`} />
      <EuiSpacer size="s" />
      <JsonBodyEditor actionIndex={index} testSubj={`${testSubj}-body`} />
    </EuiPanel>
  );
};

export const ActionEditor = memo(ActionEditorComponent);
