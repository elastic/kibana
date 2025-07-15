/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiIcon,
  EuiSelect,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { EsqlToolFieldType } from '@kbn/onechat-common';
import { capitalize, defer, noop } from 'lodash';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Controller,
  FieldError,
  FieldPath,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { promisify } from 'util';
import { useEsqlEditorParams } from '../../../../hooks/use_esql_editor_params';
import { extractEsqlParams } from '../../../../utils/extract_esql_params';
import { OnechatEsqlParam, OnechatEsqlToolFormData } from './esql_tool_form';

const i18nMessages = {
  addParamButtonLabel: i18n.translate('xpack.onechat.tools.newTool.addParamButtonLabel', {
    defaultMessage: 'Add parameter',
  }),
  inferParamsButtonLabel: i18n.translate('xpack.onechat.tools.newTool.inferParamsButtonLabel', {
    defaultMessage: 'Infer parameters from query',
  }),
  paramNameLabel: i18n.translate('xpack.onechat.tools.newTool.paramNameLabel', {
    defaultMessage: 'Name',
  }),
  paramDescriptionLabel: i18n.translate('xpack.onechat.tools.newTool.paramDescriptionLabel', {
    defaultMessage: 'Description',
  }),
  paramTypeLabel: i18n.translate('xpack.onechat.tools.newTool.paramTypeLabel', {
    defaultMessage: 'Type',
  }),
  removeParamButtonLabel: i18n.translate('xpack.onechat.tools.newTool.removeParamButtonLabel', {
    defaultMessage: 'Remove parameter',
  }),
  noParamsMessage: i18n.translate('xpack.onechat.tools.newTool.noParamsMessage', {
    defaultMessage: 'Add parameters or infer them from your ES|QL query.',
  }),
  paramUnusedWarning: (name: string) =>
    i18n.translate('xpack.onechat.tools.newTool.paramUnusedWarning', {
      defaultMessage: 'Parameter "{name}" is not used in the ES|QL query.',
      values: { name },
    }),
};

const useTriggerEsqlParamWarnings = () => {
  const { getValues, setValue } = useFormContext<OnechatEsqlToolFormData>();

  return useCallback(() => {
    const esql = getValues('esql');
    const formParams = getValues('params');
    if (!formParams) return;

    const inferredParams = new Set(extractEsqlParams(esql));

    formParams.forEach((param, index) => {
      const shouldWarn = param.name && !inferredParams.has(param.name);

      setValue(
        `params.${index}.warning`,
        shouldWarn ? i18nMessages.paramUnusedWarning(param.name) : undefined,
        {
          shouldValidate: false,
          shouldDirty: true,
        }
      );
    });
  }, [getValues, setValue]);
};

const useTriggerEsqlParamFieldsValidation = () => {
  const { trigger, getValues } = useFormContext<OnechatEsqlToolFormData>();
  return useCallback(
    (fieldsToValidate: Array<keyof OnechatEsqlParam>) => {
      const fieldPaths = getValues('params').flatMap((_, i) =>
        fieldsToValidate.map((field) => `params.${i}.${field}`)
      ) as Array<FieldPath<OnechatEsqlToolFormData>>;
      trigger(fieldPaths);
    },
    [trigger, getValues]
  );
};

interface EsqlParamRowProps {
  index: number;
  paramField: OnechatEsqlParam & { id: string; warning?: string };
  removeParamField: (index: number) => void;
}

const EsqlParamRow: React.FC<EsqlParamRowProps> = ({ index, paramField, removeParamField }) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { control, formState } = useFormContext<OnechatEsqlToolFormData>();
  const { errors, isSubmitted } = formState;

  const triggerParamWarnings = useTriggerEsqlParamWarnings();
  const triggerParamFieldsValidation = useTriggerEsqlParamFieldsValidation();

  const handleValidation = useCallback(() => {
    triggerParamFieldsValidation(['name']);
    triggerParamWarnings();
  }, [triggerParamFieldsValidation, triggerParamWarnings]);

  const warning = useWatch({
    control,
    name: `params.${index}.warning`,
  });

  const paramErrors = errors.params?.[index];
  const errorMessages = useMemo(() => {
    return [paramErrors?.name, paramErrors?.description, paramErrors?.type]
      .filter((error): error is FieldError => !!error)
      .map((error) => error.message)
      .join('\n');
  }, [paramErrors?.name, paramErrors?.description, paramErrors?.type]);

  return (
    <EuiTableRow
      key={paramField.id}
      css={css`
        &:hover {
          background-color: inherit; /* Disable row hover effect */
        }
      `}
    >
      <EuiTableRowCell>
        {errorMessages ? (
          <EuiToolTip content={errorMessages}>
            <EuiIcon type="errorFilled" color={euiTheme.colors.danger} size="m" />
          </EuiToolTip>
        ) : (
          warning && (
            <EuiToolTip content={warning}>
              <EuiIcon type="warningFilled" color={euiTheme.colors.warning} size="m" />
            </EuiToolTip>
          )
        )}
      </EuiTableRowCell>
      <EuiTableRowCell
        textOnly={false}
        mobileOptions={{
          header: i18nMessages.paramNameLabel,
          width: '100%',
        }}
      >
        <Controller
          control={control}
          name={`params.${index}.name`}
          render={({ field: { ref, onChange, onBlur, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              compressed
              fullWidth={isMobile}
              placeholder="Name"
              inputRef={ref}
              isInvalid={invalid}
              onBlur={handleValidation}
              onChange={(event) => {
                onChange(event);
                if (isSubmitted) {
                  handleValidation();
                }
              }}
              {...field}
            />
          )}
        />
      </EuiTableRowCell>
      <EuiTableRowCell
        textOnly={false}
        mobileOptions={{
          header: i18nMessages.paramDescriptionLabel,
          width: '100%',
        }}
      >
        <Controller
          control={control}
          name={`params.${index}.description`}
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiFieldText
              compressed
              fullWidth={isMobile}
              placeholder="Description"
              inputRef={ref}
              isInvalid={invalid}
              {...field}
            />
          )}
        />
      </EuiTableRowCell>
      <EuiTableRowCell
        textOnly={false}
        mobileOptions={{
          header: i18nMessages.paramTypeLabel,
          width: '100%',
        }}
      >
        <Controller
          control={control}
          name={`params.${index}.type`}
          render={({ field: { ref, ...field }, fieldState: { invalid } }) => (
            <EuiSelect
              compressed
              fullWidth={isMobile}
              options={Object.values(EsqlToolFieldType).map((option) => ({
                value: option,
                text: capitalize(option),
              }))}
              inputRef={ref}
              isInvalid={invalid}
              {...field}
            />
          )}
        />
      </EuiTableRowCell>
      <EuiTableRowCell hasActions>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          onClick={() => {
            removeParamField(index);
            triggerParamFieldsValidation(['name']);
          }}
          size="s"
          aria-label={i18nMessages.removeParamButtonLabel}
        />
      </EuiTableRowCell>
    </EuiTableRow>
  );
};

export const OnechatEsqlEditorField = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const { control, getValues, formState, trigger } = useFormContext<OnechatEsqlToolFormData>();
  const { errors, isSubmitted } = formState;

  const {
    fields: paramFields,
    replace: replaceParamFields,
    append: appendParamField,
    remove: removeParamField,
  } = useFieldArray({
    control,
    name: 'params',
  });

  const params = useWatch({
    control,
    name: 'params',
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEsqlEditorParams({
    params,
    addParam: (name) => appendParamField({ name, description: '', type: ES_FIELD_TYPES.TEXT }),
  });

  const scrollToParamsTable = useCallback(() => {
    defer(() => {
      const element = tableContainerRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        const isVisible =
          rect.top >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

        if (!isVisible) {
          element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    });
  }, []);

  const triggerParamWarnings = useTriggerEsqlParamWarnings();
  const triggerParamFieldsValidation = useTriggerEsqlParamFieldsValidation();

  const inferParamsFromEsql = useCallback(() => {
    const inferredParamNamesFromEsql = extractEsqlParams(getValues('esql'));

    const existingParamsNameMap = getValues('params').reduce((paramNamesMap, param) => {
      if (!paramNamesMap[param.name]) {
        paramNamesMap[param.name] = param;
      }
      return paramNamesMap;
    }, {} as Record<string, OnechatEsqlParam>);

    const updatedParams = [...new Set(inferredParamNamesFromEsql)].map((inferredParamName) => {
      return (
        existingParamsNameMap[inferredParamName] ?? {
          name: inferredParamName,
          description: '',
          type: ES_FIELD_TYPES.TEXT,
        }
      );
    });

    replaceParamFields(updatedParams);
    scrollToParamsTable();
    triggerParamWarnings();
  }, [getValues, replaceParamFields, scrollToParamsTable, triggerParamWarnings]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup direction="column" gutterSize="xs">
        <Controller
          control={control}
          name="esql"
          render={({ field: { onBlur, ...field } }) => (
            <div
              onBlur={() => {
                onBlur();
                triggerParamWarnings();
              }}
            >
              <ESQLLangEditor
                query={{ esql: field.value }}
                onTextLangQueryChange={(query) => {
                  field.onChange(query.esql);
                  if (isSubmitted) {
                    triggerParamWarnings();
                  }
                }}
                onTextLangQuerySubmit={promisify(noop)} // Required prop, but we don't need it
                editorIsInline
                hideRunQueryText
                hasOutline
                hideRunQueryButton
                hideQueryHistory
                hideTimeFilterInfo
                disableAutoFocus
              />
            </div>
          )}
        />
        {errors.esql?.message && <EuiFormErrorText>{errors.esql.message}</EuiFormErrorText>}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize={isMobile ? 's' : 'm'}>
        <EuiFlexItem>
          <EuiButton
            iconType="plusInCircle"
            color="primary"
            size="s"
            onClick={() => {
              triggerParamFieldsValidation(['name', 'description', 'type']);
              appendParamField({ name: '', description: '', type: ES_FIELD_TYPES.TEXT });
            }}
          >
            {i18nMessages.addParamButtonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            iconType="sparkles"
            color="primary"
            size="s"
            onClick={() => {
              inferParamsFromEsql();
              trigger('esql');
              triggerParamFieldsValidation(['name']);
            }}
          >
            {i18nMessages.inferParamsButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {paramFields.length > 0 ? (
        <div
          ref={tableContainerRef}
          css={css`
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-radius: ${euiTheme.border.radius.medium};
            padding: ${euiTheme.size.s};

            .euiTable {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
        >
          <EuiTable compressed>
            <EuiTableHeader>
              <EuiTableHeaderCell width="24px" />
              <EuiTableHeaderCell width="25%">Name</EuiTableHeaderCell>
              <EuiTableHeaderCell width="50%">Description</EuiTableHeaderCell>
              <EuiTableHeaderCell width="100px">Type</EuiTableHeaderCell>
              <EuiTableHeaderCell width="36px" />
            </EuiTableHeader>
            <EuiTableBody>
              {paramFields.map((paramField, index) => (
                <EsqlParamRow
                  key={paramField.id}
                  index={index}
                  paramField={paramField}
                  removeParamField={removeParamField}
                />
              ))}
            </EuiTableBody>
          </EuiTable>
        </div>
      ) : (
        <EuiText size="s" color="subdued">
          {i18nMessages.noParamsMessage}
        </EuiText>
      )}
    </EuiFlexGroup>
  );
});
