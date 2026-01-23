/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  last,
  castArray,
  each,
  isEmpty,
  find,
  orderBy,
  sortedUniqBy,
  isArray,
  map,
  reduce,
  trim,
  get,
} from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxProps, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import sqliteParser from '@appland/sql-parser';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';

import type { FieldErrors, UseFieldArrayRemove, UseFormReturn } from 'react-hook-form';
import { useForm, useController, useFieldArray, useFormContext } from 'react-hook-form';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import type { ECSMappingArray } from '../../../common/utils/converters';
import {
  convertECSMappingToArray,
  convertECSMappingToObject,
} from '../../../common/utils/converters';
import ECSSchema from '../../common/schemas/ecs/v9.2.0.json';
import osquerySchema from '../../common/schemas/osquery/v5.19.0.json';

import { FieldIcon } from '../../common/lib/kibana';
import { OsqueryIcon } from '../../components/osquery_icon';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { overflowCss } from '../utils';
import {
  resultComboBoxCss,
  fieldSpanCss,
  fieldIconCss,
  buttonWrapperCss,
  descriptionWrapperCss,
  semicolonWrapperCss,
  ECSFieldWrapperCss,
  euiSuperSelectCss,
} from './ecs_field_css';

export type ECSMappingFormReturn = UseFormReturn<{ ecsMappingArray: ECSMappingArray }>;

const typeMap = {
  binary: 'binary',
  half_float: 'number',
  scaled_float: 'number',
  float: 'number',
  integer: 'number',
  long: 'number',
  short: 'number',
  byte: 'number',
  text: 'string',
  keyword: 'string',
  '': 'string',
  geo_point: 'geo_point',
  date: 'date',
  ip: 'ip',
  boolean: 'boolean',
  constant_keyword: 'string',
};

const SINGLE_SELECTION = { asPlainText: true };

const ECSSchemaOptions = ECSSchema.map((ecs) => ({
  label: ecs.field,
  value: ecs,
}));

type ECSSchemaOption = (typeof ECSSchemaOptions)[0];

interface ECSComboboxFieldProps {
  euiFieldProps: EuiComboBoxProps<ECSSchemaOption>;
  control: ECSMappingFormReturn['control'];
  watch: ECSMappingFormReturn['watch'];
  index: number;
  idAria?: string;
  error?: string;
}

const ECSComboboxFieldComponent: React.FC<ECSComboboxFieldProps> = ({
  euiFieldProps = {},
  idAria,
  index,
  watch,
  control,
}) => {
  const { ecsMappingArray } = watch();
  const ecsCurrentMapping = get(ecsMappingArray, `[${index}].result.value`);

  const ecsFieldValidator = useCallback(
    (value: string) =>
      !value?.length && ecsCurrentMapping?.length
        ? i18n.translate('xpack.osquery.pack.queryFlyoutForm.ecsFieldRequiredErrorMessage', {
            defaultMessage: 'ECS field is required.',
          })
        : undefined,
    [ecsCurrentMapping?.length]
  );

  const { field: ECSField, fieldState: ECSFieldState } = useController({
    control,
    name: `ecsMappingArray.${index}.key`,
    rules: {
      validate: ecsFieldValidator,
    },
    defaultValue: '',
  });

  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<ECSSchemaOption>>>(
    []
  );
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);
  const { ecsMappingArray: watchedEcsMapping } = watch();
  const handleChange = useCallback(
    (newSelectedOptions: any) => {
      setSelected(newSelectedOptions);
      ECSField.onChange(newSelectedOptions[0]?.label ?? '');
    },
    [ECSField]
  );

  // TODO: Create own component for this.
  const renderOption = useCallback(
    (option: any, searchValue: any, contentClassName: any) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem euiSuggestItem--truncate`}
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          {
            // @ts-expect-error update types
            <FieldIcon type={typeMap[option.value.type] ?? option.value.type} aria-hidden="true" />
          }
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span
            css={fieldSpanCss}
            className="euiSuggestItem__label euiSuggestItem__label--expand"
            aria-hidden="true"
          >
            <b>{option.value.field}</b>
          </span>
        </EuiFlexItem>

        <EuiFlexItem css={descriptionWrapperCss} grow={false}>
          <span
            css={fieldSpanCss}
            className="euiSuggestItem__description euiSuggestItem__description"
          >
            {option.value.description}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const prepend = useMemo(
    () => (
      <FieldIcon
        css={fieldIconCss}
        size="l"
        type={
          // @ts-expect-error update types
          typeMap[selectedOptions[0]?.value?.type] ?? selectedOptions[0]?.value?.type
        }
      />
    ),
    [selectedOptions]
  );

  const helpText = useMemo(() => {
    // @ts-expect-error update types
    let text = selectedOptions[0]?.value?.description;

    if (!text) return;

    // @ts-expect-error update types
    const example = selectedOptions[0]?.value?.example;
    if (example) {
      text += ` e.g. ${JSON.stringify(example)}`;
    }

    return text;
  }, [selectedOptions]);

  const availableECSSchemaOptions = useMemo(() => {
    const currentFormECSFieldValues = map(watchedEcsMapping, 'key');

    return ECSSchemaOptions.filter(({ label }) => !currentFormECSFieldValues.includes(label));
  }, [watchedEcsMapping]);

  useEffect(() => {
    // @ts-expect-error update types
    setSelected(() => {
      if (!ECSField.value?.length) return [];

      const selectedOption = find(ECSSchemaOptions, ['label', ECSField.value]);

      return selectedOption
        ? [selectedOption]
        : [
            {
              label: ECSField.value,
              value: {
                value: ECSField.value,
              },
            },
          ];
    });
  }, [ECSField.value]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.mappingEcsFieldLabel', {
        defaultMessage: 'ECS field',
      })}
      helpText={helpText}
      error={ECSFieldState.error?.message}
      isInvalid={!!ECSFieldState.error?.message?.length}
      fullWidth
      describedByIds={describedByIds}
      isDisabled={euiFieldProps.isDisabled}
    >
      <EuiComboBox
        isInvalid={!!ECSFieldState.error?.message?.length}
        prepend={prepend}
        fullWidth
        singleSelection={SINGLE_SELECTION}
        error={ECSFieldState.error?.message}
        // @ts-expect-error update types
        options={availableECSSchemaOptions}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        data-test-subj="ECS-field-input"
        renderOption={renderOption}
        rowHeight={32}
        isClearable
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const ECSComboboxField = React.memo(ECSComboboxFieldComponent, deepEqual);

const OSQUERY_COLUMN_VALUE_TYPE_OPTIONS = [
  {
    value: 'field',
    inputDisplay: <OsqueryIcon size="m" />,
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <OsqueryIcon size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" className="eui-textNoWrap">
            <FormattedMessage
              id="xpack.osquery.pack.form.ecsMappingSection.osqueryValueOptionLabel"
              defaultMessage="Osquery value"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'value',
    inputDisplay: <EuiIcon type="user" size="m" />,
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="user" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" className="eui-textNoWrap">
            <FormattedMessage
              id="xpack.osquery.pack.form.ecsMappingSection.staticValueOptionLabel"
              defaultMessage="Static value"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

const EMPTY_ARRAY: EuiComboBoxOptionOption[] = [];

interface OsqueryColumnFieldProps {
  euiFieldProps: EuiComboBoxProps<OsquerySchemaOption>;
  index: number;
  control: ECSMappingFormReturn['control'];
  watch: ECSMappingFormReturn['watch'];
  trigger: ECSMappingFormReturn['trigger'];
  idAria?: string;
  isLastItem: boolean;
}

const OsqueryColumnFieldComponent: React.FC<OsqueryColumnFieldProps> = ({
  euiFieldProps,
  idAria,
  index,
  isLastItem,
  control,
  watch,
  trigger,
}) => {
  const { ecsMappingArray } = watch();

  const osqueryResultFieldValidator = useCallback(
    (value: string | string[]): string | undefined => {
      const currentMapping = ecsMappingArray && ecsMappingArray[index];

      if (!value?.length && currentMapping?.key?.length) {
        return i18n.translate(
          'xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldRequiredErrorMessage',
          {
            defaultMessage: 'Value field is required.',
          }
        );
      }

      if (!value?.length || currentMapping?.result?.type !== 'field') return;

      const osqueryColumnExists = find(euiFieldProps.options, [
        'label',
        isArray(value) ? value[0] : value,
      ]);

      return !osqueryColumnExists
        ? i18n.translate(
            'xpack.osquery.pack.queryFlyoutForm.osqueryResultFieldValueMissingErrorMessage',
            {
              defaultMessage: 'The current query does not return a {columnName} field',
              values: {
                columnName: isArray(value) ? value[0] : value,
              },
            }
          )
        : undefined;
    },
    [ecsMappingArray, euiFieldProps.options, index]
  );

  const { field: resultTypeField } = useController({
    control,
    name: `ecsMappingArray.${index}.result.type`,
    defaultValue: OSQUERY_COLUMN_VALUE_TYPE_OPTIONS[0].value,
  });

  const { field: resultField, fieldState: resultFieldState } = useController({
    control,
    name: `ecsMappingArray.${index}.result.value`,
    rules: {
      validate: osqueryResultFieldValidator,
    },
    defaultValue: '',
  });

  const inputRef = useRef<HTMLInputElement>();
  const [selectedOptions, setSelected] = useState<OsquerySchemaOption[]>([]);
  const describedByIds = useMemo(() => (idAria ? [idAria] : []), [idAria]);

  const renderOsqueryOption = useCallback(
    (option: any, searchValue: any, contentClassName: any) => (
      <EuiFlexGroup
        className={`${contentClassName} euiSuggestItem euiSuggestItem--truncate`}
        alignItems="center"
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          <span css={fieldSpanCss} className="euiSuggestItem__label euiSuggestItem__label--expand">
            <b>{option.value.suggestion_label}</b>
          </span>
        </EuiFlexItem>
        <EuiFlexItem css={descriptionWrapperCss} grow={false}>
          <span
            css={fieldSpanCss}
            className="euiSuggestItem__description euiSuggestItem__description"
          >
            {option.value.description}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const handleKeyChange = useCallback(
    (newSelectedOptions: any) => {
      setSelected(newSelectedOptions);
      resultField.onChange(
        isArray(newSelectedOptions)
          ? map(newSelectedOptions, 'label')
          : newSelectedOptions[0]?.label ?? ''
      );
    },
    [resultField]
  );

  const isSingleSelection = useMemo(() => {
    const ecsData = get(ecsMappingArray, `${index}`);
    if (ecsData?.key?.length && resultTypeField.value === 'value') {
      const ecsKeySchemaOption = find(ECSSchemaOptions, ['label', ecsData?.key]);

      return ecsKeySchemaOption?.value?.normalization !== 'array';
    }

    if (!ecsData?.key?.length && isLastItem) {
      return true;
    }

    return !!ecsData?.key?.length;
  }, [ecsMappingArray, index, isLastItem, resultTypeField.value]);

  const onTypeChange = useCallback(
    (newType: any) => {
      if (newType !== resultTypeField.value) {
        resultTypeField.onChange(newType);
        resultField.onChange(newType === 'value' && isSingleSelection === false ? [] : '');
      }
    },
    [isSingleSelection, resultField, resultTypeField]
  );

  const handleCreateOption = useCallback(
    (newOption: string) => {
      const trimmedNewOption = trim(newOption);

      if (!trimmedNewOption.length) return;

      if (isSingleSelection === false) {
        resultField.onChange([trimmedNewOption]);
        if (resultField.value?.length) {
          resultField.onChange([...castArray(resultField.value), trimmedNewOption]);
        } else {
          resultField.onChange([trimmedNewOption]);
        }

        inputRef.current?.blur();
      } else {
        resultField.onChange(trimmedNewOption);
      }
    },
    [isSingleSelection, resultField]
  );

  const Prepend = useMemo(
    () => (
      <EuiSuperSelect
        css={euiSuperSelectCss}
        disabled={euiFieldProps.isDisabled}
        options={OSQUERY_COLUMN_VALUE_TYPE_OPTIONS}
        data-test-subj={`osquery-result-type-select-${index}`}
        valueOfSelected={resultTypeField.value || OSQUERY_COLUMN_VALUE_TYPE_OPTIONS[0].value}
        aria-label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.valueTypeSelectLabel', {
          defaultMessage: 'Value type',
        })}
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        popoverProps={{
          panelStyle: {
            minWidth: '250px',
          },
        }}
        onChange={onTypeChange}
      />
    ),
    [euiFieldProps.isDisabled, index, onTypeChange, resultTypeField.value]
  );

  useEffect(() => {
    if (isSingleSelection && isArray(resultField.value)) {
      resultField.onChange(resultField.value.join(' '));
    }

    if (!isSingleSelection && !isArray(resultField.value)) {
      const value = resultField.value.length ? [resultField.value] : [];
      resultField.onChange(value);
    }
  }, [index, isSingleSelection, resultField, resultField.value]);

  useEffect(() => {
    // @ts-expect-error hard to type to satisfy TS, but it represents proper types
    setSelected((_: OsquerySchemaOption[]): OsquerySchemaOption[] | Array<{ label: string }> => {
      if (!resultField.value?.length) return [];

      // Static array values
      if (isArray(resultField.value)) {
        return resultField.value.map((value) => ({ label: value })) as OsquerySchemaOption[];
      }

      const selectedOption = find(euiFieldProps?.options, ['label', resultField.value]) as
        | OsquerySchemaOption
        | undefined;

      return selectedOption ? [selectedOption] : [{ label: resultField.value }];
    });
  }, [euiFieldProps?.options, setSelected, resultField.value]);

  useEffect(() => {
    trigger(`ecsMappingArray.${index}.key`);
  }, [resultField.value, trigger, index]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.queryFlyoutForm.mappingValueFieldLabel', {
        defaultMessage: 'Value',
      })}
      helpText={selectedOptions[0]?.value?.description}
      error={resultFieldState.error?.message}
      isInvalid={!!resultFieldState.error?.message?.length}
      fullWidth
      describedByIds={describedByIds}
      isDisabled={euiFieldProps.isDisabled}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem css={overflowCss} grow={false}>
          {Prepend}
        </EuiFlexItem>
        <EuiFlexItem css={overflowCss}>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore*/}
          <EuiComboBox
            css={resultComboBoxCss}
            error={resultFieldState.error?.message}
            // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
            inputRef={(ref: HTMLInputElement) => {
              inputRef.current = ref;
            }}
            fullWidth
            selectedOptions={selectedOptions}
            onChange={handleKeyChange}
            onCreateOption={handleCreateOption}
            renderOption={renderOsqueryOption}
            rowHeight={32}
            isClearable
            singleSelection={isSingleSelection ? SINGLE_SELECTION : false}
            aria-label={i18n.translate(
              'xpack.osquery.pack.queryFlyoutForm.mappingValueFieldLabel',
              {
                defaultMessage: 'Value',
              }
            )}
            {...euiFieldProps}
            data-test-subj="osqueryColumnValueSelect"
            options={(resultTypeField.value === 'field' && euiFieldProps.options) || EMPTY_ARRAY}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

export const OsqueryColumnField = React.memo(OsqueryColumnFieldComponent, deepEqual);

export interface ECSMappingEditorFieldProps {
  euiFieldProps?: EuiComboBoxProps<{}>;
}

interface ECSMappingEditorFormProps {
  isDisabled?: boolean;
  osquerySchemaOptions: OsquerySchemaOption[];
  index: number;
  isLastItem: boolean;
  control: ECSMappingFormReturn['control'];
  watch: ECSMappingFormReturn['watch'];
  trigger: ECSMappingFormReturn['trigger'];
  onDelete?: UseFieldArrayRemove;
}

export const defaultEcsFormData = {
  key: '',
  result: {
    type: 'field',
    value: '',
  },
};

export const ECSMappingEditorForm: React.FC<ECSMappingEditorFormProps> = ({
  isDisabled,
  osquerySchemaOptions,
  isLastItem,
  index,
  onDelete,
  control,
  watch,
  trigger,
}) => {
  const handleDeleteClick = useCallback(() => {
    if (onDelete) {
      onDelete(index);
    }
  }, [index, onDelete]);

  return (
    <>
      <EuiFlexGroup data-test-subj="ECSMappingEditorForm" alignItems="flexStart" gutterSize="s">
        <EuiFlexItem css={overflowCss}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" wrap>
            <EuiFlexItem css={overflowCss}>
              <ECSComboboxField
                control={control}
                watch={watch}
                index={index}
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  isDisabled,
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={semicolonWrapperCss}>
              <EuiText>:</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={overflowCss}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" wrap>
            <EuiFlexItem css={ECSFieldWrapperCss}>
              <OsqueryColumnField
                control={control}
                watch={watch}
                trigger={trigger}
                index={index}
                isLastItem={isLastItem}
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  // @ts-expect-error update types
                  options: osquerySchemaOptions,
                  isDisabled,
                }}
              />
            </EuiFlexItem>
            {!isDisabled && (
              <EuiFlexItem grow={false}>
                <div css={buttonWrapperCss}>
                  {!isLastItem && (
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.osquery.pack.queryFlyoutForm.deleteECSMappingRowButtonAriaLabel',
                        {
                          defaultMessage: 'Delete ECS mapping row',
                        }
                      )}
                      iconType="trash"
                      color="danger"
                      onClick={handleDeleteClick}
                    />
                  )}
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

interface OsquerySchemaOption {
  label: string;
  value: {
    name: string;
    description?: string;
    table?: string;
    suggestion_label?: string;
  };
}

interface OsqueryColumn {
  name: string;
  description: string;
  type: string;
  hidden?: boolean;
  required?: boolean;
  index?: boolean;
}

// eslint-disable-next-line react/display-name
export const ECSMappingEditorField = React.memo(({ euiFieldProps }: ECSMappingEditorFieldProps) => {
  const {
    setError,
    clearErrors,
    watch: watchRoot,
    register: registerRoot,
    setValue: setValueRoot,
  } = useFormContext<{ query: string; ecs_mapping: ECSMapping }>();

  const latestErrors = useRef<FieldErrors<ECSMappingArray> | undefined>(undefined);
  const [query, ecsMapping] = watchRoot(['query', 'ecs_mapping']);
  const { control, trigger, watch, formState, resetField, getFieldState } = useForm<{
    ecsMappingArray: ECSMappingArray;
  }>({
    mode: 'all',
    shouldUnregister: true,
    defaultValues: {
      ecsMappingArray: !isEmpty(convertECSMappingToArray(ecsMapping))
        ? [...convertECSMappingToArray(ecsMapping), defaultEcsFormData]
        : [defaultEcsFormData],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'ecsMappingArray',
  });

  const formValue = watch();
  const ecsMappingArrayState = getFieldState('ecsMappingArray', formState);
  const [osquerySchemaOptions, setOsquerySchemaOptions] = useState<OsquerySchemaOption[]>([]);

  useEffect(() => {
    registerRoot('ecs_mapping');
  }, [registerRoot]);

  useEffect(() => {
    if (!deepEqual(latestErrors.current, formState.errors.ecsMappingArray)) {
      // @ts-expect-error update types
      latestErrors.current = formState.errors.ecsMappingArray;
      if (formState.errors.ecsMappingArray?.length && formState.errors.ecsMappingArray[0]?.key) {
        setError('ecs_mapping', formState.errors.ecsMappingArray[0].key);
      } else {
        clearErrors('ecs_mapping');
      }
    }
  }, [formState, setError, clearErrors]);

  useEffect(() => {
    const subscription = watchRoot((data, payload) => {
      if (payload.name === 'ecs_mapping') {
        const parsedMapping = convertECSMappingToObject(formValue.ecsMappingArray);
        if (!deepEqual(data.ecs_mapping, parsedMapping)) {
          resetField('ecsMappingArray', {
            defaultValue: [...convertECSMappingToArray(data.ecs_mapping), defaultEcsFormData],
          });
          replace([...convertECSMappingToArray(data.ecs_mapping), defaultEcsFormData]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watchRoot, ecsMapping, replace, resetField, formValue.ecsMappingArray]);

  useEffect(() => {
    const subscription = watch((data, payload) => {
      if (data?.ecsMappingArray) {
        const lastEcsIndex = data?.ecsMappingArray?.length - 1;
        if (payload.name?.startsWith(`ecsMappingArray.${lastEcsIndex}.`)) {
          const lastEcs = last(data.ecsMappingArray);
          if (lastEcs?.key?.length && lastEcs?.result?.value?.length) {
            append(defaultEcsFormData);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [formValue, append, watch]);

  useEffect(() => {
    if (!query?.length) {
      return;
    }

    const oneLineQuery = removeMultilines(query);

    let ast: Record<string, any> | undefined;

    try {
      ast = sqliteParser(oneLineQuery)?.statement?.[0];
    } catch (e) {
      return;
    }

    const astOsqueryTables: Record<
      string,
      {
        columns: OsqueryColumn[];
        order: number;
      }
    > =
      reduce(
        ast,
        (acc, data) => {
          // select * from uptime
          if (data?.type === 'identifier' && data?.variant === 'table') {
            const osqueryTable = find(osquerySchema, ['name', data.name]);

            if (osqueryTable) {
              acc[data.alias || data.name] = {
                columns: osqueryTable.columns,
                order: Object.keys(acc).length,
              };
            }
          }

          // select * from uptime, routes
          if (data?.type === 'map' && data?.variant === 'join') {
            if (data?.source?.type === 'identifier' && data?.source?.variant === 'table') {
              const osqueryTable = find(osquerySchema, ['name', data?.source?.name]);

              if (osqueryTable) {
                acc[data?.source?.alias || data?.source?.name] = {
                  columns: osqueryTable.columns,
                  order: Object.keys(acc).length,
                };
              }
            }

            if (data?.source?.type === 'statement' && data?.source?.variant === 'compound') {
              if (
                data?.source?.statement.from.type === 'identifier' &&
                data?.source?.statement.from.variant === 'table'
              ) {
                const osqueryTable = find(osquerySchema, [
                  'name',
                  data?.source?.statement.from.name,
                ]);

                if (osqueryTable) {
                  acc[data?.source?.statement.from.alias || data?.source?.statement.from.name] = {
                    columns: osqueryTable.columns,
                    order: Object.keys(acc).length,
                  };
                }
              }
            }

            each(
              data?.map,
              (mapValue: {
                type: string;
                source: { type: string; variant: string; name: any | string; alias: any };
              }) => {
                if (mapValue?.type === 'join') {
                  if (
                    mapValue?.source?.type === 'identifier' &&
                    mapValue?.source?.variant === 'table'
                  ) {
                    const osqueryTable = find(osquerySchema, ['name', mapValue?.source?.name]);

                    if (osqueryTable) {
                      acc[mapValue?.source?.alias || mapValue?.source?.name] = {
                        columns: osqueryTable.columns,
                        order: Object.keys(acc).length,
                      };
                    }
                  }
                }
              }
            );
          }

          return acc;
        },
        {} as Record<
          string,
          {
            columns: OsqueryColumn[];
            order: number;
          }
        >
      ) ?? {};

    // Table doesn't exist in osquery schema
    if (isEmpty(astOsqueryTables)) {
      return;
    }

    const suggestions = isArray(ast?.result)
      ? ast?.result
          ?.map((selectItem: { type: string; name: string; alias?: string }) => {
            if (selectItem.type === 'identifier') {
              /*
                select * from routes, uptime;
              */
              if (ast?.result.length === 1 && selectItem.name === '*') {
                return reduce(
                  astOsqueryTables,
                  (acc, { columns: osqueryColumns, order: tableOrder }, table) => {
                    acc.push(
                      ...osqueryColumns.map((osqueryColumn) => ({
                        label: osqueryColumn.name,
                        value: {
                          name: osqueryColumn.name,
                          description: osqueryColumn.description,
                          table,
                          tableOrder,
                          suggestion_label: osqueryColumn.name,
                        },
                      }))
                    );

                    return acc;
                  },
                  [] as OsquerySchemaOption[]
                );
              }

              /*
                select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;
              */

              const [table, column] = selectItem.name.includes('.')
                ? selectItem.name.split('.')
                : [Object.keys(astOsqueryTables)[0], selectItem.name];

              if (column === '*' && astOsqueryTables[table]) {
                const { columns: osqueryColumns, order: tableOrder } = astOsqueryTables[table];

                return osqueryColumns.map((osqueryColumn) => ({
                  label: osqueryColumn.name,
                  value: {
                    name: osqueryColumn.name,
                    description: osqueryColumn.description,
                    table,
                    tableOrder,
                    suggestion_label: `${osqueryColumn.name}`,
                  },
                }));
              }

              if (astOsqueryTables[table]) {
                const osqueryColumn = find(astOsqueryTables[table].columns, ['name', column]);

                if (osqueryColumn) {
                  const label = selectItem.alias ?? column;

                  return [
                    {
                      label,
                      value: {
                        name: osqueryColumn.name,
                        description: osqueryColumn.description,
                        table,
                        tableOrder: astOsqueryTables[table].order,
                        suggestion_label: `${label}`,
                      },
                    },
                  ];
                }
              }
            }

            /*
              SELECT pid, uid, name, ROUND((
                (user_time + system_time) / (cpu_time.tsb - cpu_time.itsb)
              ) * 100, 2) AS percentage
              FROM processes, (
              SELECT (
                SUM(user) + SUM(nice) + SUM(system) + SUM(idle) * 1.0) AS tsb,
                SUM(COALESCE(idle, 0)) + SUM(COALESCE(iowait, 0)) AS itsb
                FROM cpu_time
              ) AS cpu_time
              ORDER BY user_time+system_time DESC
              LIMIT 5;
            */

            if (selectItem.type === 'function' && selectItem.alias) {
              return [
                {
                  label: selectItem.alias,
                  value: {
                    name: selectItem.alias,
                    description: '',
                    table: '',
                    tableOrder: -1,
                    suggestion_label: selectItem.alias,
                  },
                },
              ];
            }

            return [];
          })
          .flat()
      : [];

    // Remove column duplicates by keeping the column from the table that appears last in the query
    const newOptions = sortedUniqBy(
      orderBy(suggestions, ['value.suggestion_label', 'value.tableOrder'], ['asc', 'desc']),
      'label'
    );
    setOsquerySchemaOptions((prevValue) => {
      if (!deepEqual(prevValue, newOptions)) {
        trigger();

        return newOptions;
      }

      return prevValue;
    });
  }, [query, trigger]);

  useEffect(() => {
    const parsedMapping = convertECSMappingToObject(formValue.ecsMappingArray);
    if (ecsMappingArrayState.isDirty && !deepEqual(parsedMapping, ecsMapping)) {
      setValueRoot('ecs_mapping', parsedMapping, {
        shouldTouch: true,
      });
    }
  }, [setValueRoot, formValue, ecsMappingArrayState.isDirty, ecsMapping]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.osquery.pack.form.ecsMappingSection.title"
                defaultMessage="ECS mapping"
              />
            </h5>
          </EuiTitle>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.osquery.pack.form.ecsMappingSection.description"
              defaultMessage="Use the fields below to map results from this query to ECS fields."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {fields.map((item, index, array) => (
        <div key={item.id}>
          <ECSMappingEditorForm
            osquerySchemaOptions={osquerySchemaOptions}
            index={index}
            isLastItem={index === array.length - 1}
            onDelete={remove}
            isDisabled={!!euiFieldProps?.isDisabled}
            control={control}
            watch={watch}
            trigger={trigger}
          />
        </div>
      ))}
    </>
  );
});

// eslint-disable-next-line import/no-default-export
export default ECSMappingEditorField;
