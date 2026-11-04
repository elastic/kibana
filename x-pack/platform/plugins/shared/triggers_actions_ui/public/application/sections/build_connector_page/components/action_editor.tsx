/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type {
  BuildConnectorFormData,
  ConnectorTypeActionScope,
  ConnectorTypeHttpMethod,
} from '../types';
import { FieldListEditor } from './field_list_editor';
import { RequestEditor } from './request_editor';

interface Props {
  index: number;
  onRemove: () => void;
  /** Stable ID of the action in the list, passed back to `onOpenChange`. */
  id: string;
  isOpen: boolean;
  onOpenChange: (id: string, isOpen: boolean) => void;
}

const scopeOptions: Array<{ value: ConnectorTypeActionScope; text: string }> = [
  {
    value: 'read',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.scope.read', {
      defaultMessage: 'Read',
    }),
  },
  {
    value: 'write',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.scope.write', {
      defaultMessage: 'Write',
    }),
  },
  {
    value: 'destroy',
    text: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.scope.destroy', {
      defaultMessage: 'Destroy',
    }),
  },
];

const PARAMS_TOOLTIP = (
  <p>
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.buildConnectorPage.paramsTooltip"
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
    id="xpack.triggersActionsUI.sections.buildConnectorPage.paramsDescription"
    defaultMessage="Provided by a rule each time this action runs. Use as {example}."
    values={{ example: <code>{'{{input.<name>}}'}</code> }}
  />
);

const REMOVE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorPage.removeActionButtonLabel',
  { defaultMessage: 'Remove action' }
);

const METHOD_COLORS: Record<ConnectorTypeHttpMethod, string> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'danger',
};

const SCOPE_COLORS: Record<ConnectorTypeActionScope, string> = {
  read: 'hollow',
  write: 'default',
  destroy: 'danger',
};

const ERROR_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorPage.actionHasErrorsLabel',
  { defaultMessage: 'This action has errors' }
);

const scopeCellCss = css({ width: 200 });

const summaryUrlCss = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** One line that identifies a collapsed action: method, name, target and scope. */
const ActionSummary: React.FC<{ index: number; hasErrors: boolean; isOpen: boolean }> = ({
  index,
  hasErrors,
  isOpen,
}) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const [actionName, scope, method, url, path, input] = useWatch({
    control,
    name: [
      `actions.${index}.name`,
      `actions.${index}.scope`,
      `actions.${index}.request.method`,
      `actions.${index}.request.url`,
      `actions.${index}.request.path`,
      `actions.${index}.input`,
    ],
  });
  const target = `${url ?? ''}${path ?? ''}`;
  const scopeLabel = scopeOptions.find(({ value }) => value === scope)?.text;
  const paramCount = input?.length ?? 0;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {method && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={METHOD_COLORS[method]}>{method}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h5>
            {actionName?.trim() ? (
              actionName
            ) : (
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.buildConnectorPage.actionTitle"
                defaultMessage="Action {number}"
                values={{ number: index + 1 }}
              />
            )}
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      {!isOpen && target && (
        <EuiFlexItem css={summaryUrlCss}>
          <EuiText size="xs" color="subdued" css={summaryUrlCss}>
            <code>{target}</code>
          </EuiText>
        </EuiFlexItem>
      )}
      {!isOpen && scope && scopeLabel && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={SCOPE_COLORS[scope]}>{scopeLabel}</EuiBadge>
        </EuiFlexItem>
      )}
      {!isOpen && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.buildConnectorPage.actionParamCount"
              defaultMessage="{count, plural, one {# param} other {# params}}"
              values={{ count: paramCount }}
            />
          </EuiText>
        </EuiFlexItem>
      )}
      {hasErrors && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warning" color="danger" aria-label={ERROR_LABEL} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/** Editor for one action: identity, params, and the HTTP request it performs. */
const ActionEditorComponent: React.FC<Props> = ({ index, onRemove, id, isOpen, onOpenChange }) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const { errors } = useFormState({ control, name: `actions.${index}` });
  const actionErrors = errors.actions?.[index];
  const hasErrors = Boolean(actionErrors);
  const testSubj = `buildConnectorAction-${index}`;

  // A collapsed action opens on each save attempt, and on load, when it has errors, so they are
  // never hidden behind a collapsed header. Errors from editing only flag the header.
  const { submitCount } = useFormState({ control });
  const hasErrorsRef = useRef(hasErrors);
  hasErrorsRef.current = hasErrors;
  useEffect(() => {
    if (hasErrorsRef.current) {
      onOpenChange(id, true);
    }
  }, [submitCount, id, onOpenChange]);
  const onToggle = useCallback((open: boolean) => onOpenChange(id, open), [id, onOpenChange]);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={testSubj}>
      <EuiAccordion
        id={`${testSubj}-accordion`}
        forceState={isOpen ? 'open' : 'closed'}
        onToggle={onToggle}
        buttonProps={{ 'data-test-subj': `${testSubj}-toggle` }}
        buttonElement="div"
        buttonContent={<ActionSummary index={index} hasErrors={hasErrors} isOpen={isOpen} />}
        extraAction={
          <EuiToolTip content={REMOVE_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={REMOVE_LABEL}
              data-test-subj={`${testSubj}-remove`}
              onClick={onRemove}
            />
          </EuiToolTip>
        }
        paddingSize="none"
      >
        <EuiSpacer size="m" />
        {actionErrors?.root?.message && (
          <EuiFormErrorText data-test-subj={`${testSubj}-error`}>
            {actionErrors.root.message}
          </EuiFormErrorText>
        )}
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <Controller
              name={`actions.${index}.name`}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.actionNameLabel',
                    { defaultMessage: 'Name' }
                  )}
                  helpText={i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.actionNameHelpText',
                    { defaultMessage: 'Identifier a rule uses to pick this action.' }
                  )}
                  fullWidth
                  isInvalid={!!error}
                  error={error?.message}
                >
                  <EuiFieldText
                    fullWidth
                    isInvalid={!!error}
                    placeholder="create_item"
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
          <EuiFlexItem grow={false} css={scopeCellCss}>
            <Controller
              name={`actions.${index}.scope`}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.actionScopeLabel',
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
        <EuiSpacer size="m" />
        <Controller
          name={`actions.${index}.description`}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EuiFormRow
              label={i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorPage.actionDescriptionLabel',
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
        <EuiSpacer size="xl" />
        <FieldListEditor
          name={`actions.${index}.input`}
          title={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.paramsTitle', {
            defaultMessage: 'Params',
          })}
          description={PARAMS_DESCRIPTION}
          tooltipContent={PARAMS_TOOLTIP}
          addButtonLabel={i18n.translate(
            'xpack.triggersActionsUI.sections.buildConnectorPage.addParamButtonLabel',
            { defaultMessage: 'Add param' }
          )}
          testSubjPrefix={`${testSubj}-input`}
        />
        <EuiSpacer size="xl" />
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.buildConnectorPage.requestTitle"
              defaultMessage="Request"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <RequestEditor
          requestPath={`actions.${index}.request`}
          testSubj={testSubj}
          actionIndex={index}
        />
      </EuiAccordion>
    </EuiPanel>
  );
};

export const ActionEditor = memo(ActionEditorComponent);
