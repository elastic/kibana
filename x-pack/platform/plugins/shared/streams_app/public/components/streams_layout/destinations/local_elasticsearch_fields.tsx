/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  useController,
  useFormContext,
  useWatch,
  type ControllerRenderProps,
} from 'react-hook-form';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormPrepend,
  EuiFormRow,
  EuiHorizontalRule,
  EuiRadio,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DESTINATION_SIGNALS,
  composeStaticIndex,
  composeStaticIndexesForAll,
  getStaticIndexRemainder,
  SIGNAL_INDEX_FIELDS,
} from './destination_models';
import {
  DESTINATION_AUTO_MODE_LABEL,
  DESTINATION_FIXED_INDEX_MODE_LABEL,
  DESTINATION_SIGNAL_LABELS,
} from './destination_type_config';
import type {
  AutoWritePatternValidationError,
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  DestinationSignal,
  ElasticsearchDestinationFormData,
  StaticIndexNaming,
  StaticIndexValidationError,
} from './types';

type WriteTargetError = StaticIndexValidationError | AutoWritePatternValidationError | undefined;

interface LocalElasticsearchFieldsProps {
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

type IndexFieldPath = `elasticsearch.${(typeof SIGNAL_INDEX_FIELDS)[DestinationSignal]}`;

const getIndexFieldPath = (signal: DestinationSignal): IndexFieldPath =>
  `elasticsearch.${SIGNAL_INDEX_FIELDS[signal]}`;

type IndexFields = Record<
  DestinationSignal,
  ControllerRenderProps<DestinationCreationFormData, IndexFieldPath>
>;

interface WriteTargetFieldsProps extends LocalElasticsearchFieldsProps {
  elasticsearch: ElasticsearchDestinationFormData;
  indexFields: IndexFields;
  customSignalsField: ControllerRenderProps<
    DestinationCreationFormData,
    'elasticsearch.customSignals'
  >;
  /** Empties the signals and indices of the previous choice, and forgets they were touched. */
  resetWriteTargets: () => void;
}

const ALL_PREPEND = i18n.translate('xpack.streams.destinations.allSignalsPrependLabel', {
  defaultMessage: 'logs / metrics / traces',
});

const INDEX_PLACEHOLDER = i18n.translate('xpack.streams.destinations.staticIndexPlaceholder', {
  defaultMessage: 'dataset-namespace',
});

const WRITE_PATTERN_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinations.writePatternPlaceholder',
  { defaultMessage: 'dataset-*' }
);

const writeTargetErrorText = (
  signal: DestinationSignal,
  error: WriteTargetError,
  allowWildcard: boolean
): string | undefined => {
  if (error === 'required') {
    return i18n.translate('xpack.streams.destinations.writePatternRequiredErrorMessage', {
      defaultMessage: 'Enter a write pattern for {signal}.',
      values: { signal: DESTINATION_SIGNAL_LABELS[signal].toLowerCase() },
    });
  }
  if (error === 'template') {
    return i18n.translate('xpack.streams.destinations.indexTemplateNotSupportedErrorMessage', {
      defaultMessage: 'Templated index names are not supported yet.',
    });
  }
  if (error === 'uppercase') {
    return allowWildcard
      ? i18n.translate('xpack.streams.destinations.writePatternUppercaseErrorMessage', {
          defaultMessage: 'Write patterns must be lowercase.',
        })
      : i18n.translate('xpack.streams.destinations.indexUppercaseErrorMessage', {
          defaultMessage: 'Index names must be lowercase.',
        });
  }
  if (error === 'invalidCharacter') {
    return allowWildcard
      ? i18n.translate('xpack.streams.destinations.writePatternInvalidCharacterErrorMessage', {
          defaultMessage: 'Write patterns cannot contain \\ / ? " < > | , # : or spaces.',
        })
      : i18n.translate('xpack.streams.destinations.indexInvalidCharacterErrorMessage', {
          defaultMessage: 'Index names cannot contain \\ / * ? " < > | , # : or spaces.',
        });
  }
  if (error === 'signalPattern') {
    return i18n.translate('xpack.streams.destinations.indexSignalPatternErrorMessage', {
      defaultMessage: 'Must follow {pattern}. The dataset and namespace cannot contain "-".',
      values: { pattern: `${signal}-<dataset>-<namespace>` },
    });
  }
  if (error === 'invalidName') {
    return i18n.translate('xpack.streams.destinations.indexInvalidNameErrorMessage', {
      defaultMessage: 'Enter a valid data stream name.',
    });
  }
  return undefined;
};

const SignalIndexField = ({
  signal,
  value,
  error,
  allowWildcard,
  disabled,
  onChange,
  onBlur,
}: {
  signal: DestinationSignal;
  value: string;
  error: WriteTargetError;
  allowWildcard: boolean;
  disabled: boolean;
  onChange: (index: string) => void;
  onBlur: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const errorText = writeTargetErrorText(signal, error, allowWildcard);
  // Same width for every signal, so the index inputs line up.
  const prependStyles = css`
    inline-size: ${euiTheme.base * 5}px;
  `;
  return (
    <EuiFormRow fullWidth isInvalid={Boolean(errorText)} error={errorText}>
      <EuiFieldText
        fullWidth
        value={getStaticIndexRemainder(signal, value)}
        disabled={disabled}
        isInvalid={Boolean(errorText)}
        prepend={<EuiFormPrepend label={signal} css={prependStyles} />}
        onChange={(event) => onChange(composeStaticIndex(signal, event.target.value))}
        onBlur={onBlur}
        placeholder={allowWildcard ? WRITE_PATTERN_PLACEHOLDER : INDEX_PLACEHOLDER}
        aria-label={
          allowWildcard
            ? i18n.translate('xpack.streams.destinations.signalWritePatternAriaLabel', {
                defaultMessage: '{signal} write pattern',
                values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
              })
            : i18n.translate('xpack.streams.destinations.signalIndexAriaLabel', {
                defaultMessage: '{signal} index name',
                values: { signal: DESTINATION_SIGNAL_LABELS[signal] },
              })
        }
        data-test-subj={`streamsCreateDestination-${signal}-index`}
      />
    </EuiFormRow>
  );
};

const AutoFields = ({
  elasticsearch,
  errors,
  disabled,
  indexFields,
  customSignalsField,
  resetWriteTargets,
}: WriteTargetFieldsProps) => {
  const { setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const { useCustomWritePatterns, customSignals } = elasticsearch;

  const toggleSignal = (signal: DestinationSignal) => {
    if (customSignals.includes(signal)) {
      resetField(getIndexFieldPath(signal));
      customSignalsField.onChange(customSignals.filter((candidate) => candidate !== signal));
    } else {
      customSignalsField.onChange([...customSignals, signal]);
    }
    customSignalsField.onBlur();
  };

  return (
    <>
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.streams.destinations.customWritePatternsSwitchLabel', {
          defaultMessage: 'Use custom write patterns',
        })}
        checked={useCustomWritePatterns}
        disabled={disabled}
        onChange={(event) => {
          resetWriteTargets();
          setValue('elasticsearch.useCustomWritePatterns', event.target.checked, {
            shouldDirty: true,
          });
        }}
        data-test-subj="streamsCreateDestinationCustomWritePatterns"
      />
      {useCustomWritePatterns && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.streams.destinations.customWritePatternsHelpDescription', {
                defaultMessage:
                  "Selected signals use your write pattern. Signals you don't select aren't sent to this destination. Use * as a wildcard.",
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            gutterSize="xs"
            responsive={false}
            wrap
            role="group"
            aria-label={i18n.translate('xpack.streams.destinations.customSignalsAriaLabel', {
              defaultMessage: 'Signals with a custom write pattern',
            })}
          >
            {DESTINATION_SIGNALS.map((signal) => {
              const isSelected = customSignals.includes(signal);
              return (
                <EuiFlexItem key={signal} grow={false}>
                  <EuiBadge
                    color={isSelected ? 'primary' : 'hollow'}
                    iconType={isSelected ? 'check' : 'cross'}
                    isDisabled={disabled}
                    onClick={(event) => {
                      // EuiBadge renders a button without `type`, which would submit the form.
                      event.preventDefault();
                      toggleSignal(signal);
                    }}
                    onClickAriaLabel={DESTINATION_SIGNAL_LABELS[signal]}
                    aria-pressed={isSelected}
                    data-test-subj={`streamsCreateDestinationCustomSignal-${signal}`}
                  >
                    {DESTINATION_SIGNAL_LABELS[signal]}
                  </EuiBadge>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          {errors.customSignals === 'required' && (
            <EuiText size="xs" color="danger">
              <p>
                {i18n.translate('xpack.streams.destinations.customSignalsRequiredErrorMessage', {
                  defaultMessage: 'Select at least one signal.',
                })}
              </p>
            </EuiText>
          )}
          {DESTINATION_SIGNALS.filter((signal) => customSignals.includes(signal)).map((signal) => (
            <React.Fragment key={signal}>
              <EuiSpacer size="s" />
              <SignalIndexField
                signal={signal}
                value={elasticsearch[SIGNAL_INDEX_FIELDS[signal]]}
                error={errors[SIGNAL_INDEX_FIELDS[signal]]}
                allowWildcard
                disabled={disabled}
                onChange={indexFields[signal].onChange}
                onBlur={indexFields[signal].onBlur}
              />
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );
};

const StaticFields = ({ elasticsearch, errors, disabled, indexFields }: WriteTargetFieldsProps) => {
  const { setValue } = useFormContext<DestinationCreationFormData>();
  const { staticNaming } = elasticsearch;
  const requiredError =
    errors.staticIndexes === 'required'
      ? i18n.translate('xpack.streams.destinations.staticIndexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;

  const namingOptions = [
    {
      id: 'shared',
      label: i18n.translate('xpack.streams.destinations.sharedIndexNamingLabel', {
        defaultMessage: 'Enter a name for all signals',
      }),
      'data-test-subj': 'streamsCreateDestinationIndexNaming-shared',
    },
    {
      id: 'perSignal',
      label: i18n.translate('xpack.streams.destinations.perSignalIndexNamingLabel', {
        defaultMessage: 'Name signals individually',
      }),
      'data-test-subj': 'streamsCreateDestinationIndexNaming-perSignal',
    },
  ];

  const setSharedIndex = (remainder: string) => {
    const indexes = composeStaticIndexesForAll(remainder);
    for (const signal of DESTINATION_SIGNALS) {
      indexFields[signal].onChange(indexes[SIGNAL_INDEX_FIELDS[signal]]);
    }
  };

  const onNamingChange = (nextNaming: string) => {
    const naming = nextNaming as StaticIndexNaming;
    setValue('elasticsearch.staticNaming', naming, { shouldDirty: true });
    if (naming === 'shared') {
      setSharedIndex(
        DESTINATION_SIGNALS.map((signal) =>
          getStaticIndexRemainder(signal, elasticsearch[SIGNAL_INDEX_FIELDS[signal]])
        ).find(Boolean) ?? ''
      );
    }
  };

  const sharedError =
    writeTargetErrorText('logs', errors.logsIndex, false) ??
    writeTargetErrorText('metrics', errors.metricsIndex, false) ??
    writeTargetErrorText('traces', errors.tracesIndex, false) ??
    requiredError;

  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.streams.destinations.fixedIndexNameTitle', {
            defaultMessage: 'Fixed index name',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        legend={i18n.translate('xpack.streams.destinations.indexNamingLegend', {
          defaultMessage: 'Fixed index naming',
        })}
        buttonSize="compressed"
        isFullWidth
        isDisabled={disabled}
        options={namingOptions}
        idSelected={staticNaming}
        onChange={onNamingChange}
        data-test-subj="streamsCreateDestinationIndexNaming"
      />
      <EuiSpacer size="s" />
      {staticNaming === 'shared' ? (
        <EuiFormRow
          fullWidth
          helpText={i18n.translate('xpack.streams.destinations.allSignalsIndexHelpDescription', {
            defaultMessage:
              'The same name is applied to logs, metrics, and traces as type-dataset-namespace.',
          })}
          isInvalid={Boolean(sharedError)}
          error={sharedError}
        >
          <EuiFieldText
            fullWidth
            value={getStaticIndexRemainder('logs', elasticsearch.logsIndex)}
            disabled={disabled}
            isInvalid={Boolean(sharedError)}
            prepend={<EuiFormPrepend label={ALL_PREPEND} />}
            onChange={(event) => setSharedIndex(event.target.value)}
            onBlur={() => {
              for (const signal of DESTINATION_SIGNALS) {
                indexFields[signal].onBlur();
              }
            }}
            placeholder={INDEX_PLACEHOLDER}
            aria-label={i18n.translate('xpack.streams.destinations.sharedIndexAriaLabel', {
              defaultMessage: 'Index name for all signals',
            })}
            data-test-subj="streamsCreateDestinationIndex"
          />
        </EuiFormRow>
      ) : (
        <>
          {DESTINATION_SIGNALS.map((signal, position) => (
            <React.Fragment key={signal}>
              {position > 0 && <EuiSpacer size="s" />}
              <SignalIndexField
                signal={signal}
                value={elasticsearch[SIGNAL_INDEX_FIELDS[signal]]}
                error={errors[SIGNAL_INDEX_FIELDS[signal]]}
                allowWildcard={false}
                disabled={disabled}
                onChange={indexFields[signal].onChange}
                onBlur={indexFields[signal].onBlur}
              />
            </React.Fragment>
          ))}
          <EuiText size="xs" color={requiredError ? 'danger' : 'subdued'}>
            <p>
              {requiredError ??
                i18n.translate('xpack.streams.destinations.perSignalIndexHelpDescription', {
                  defaultMessage: 'Leave a signal blank to not send it to this destination.',
                })}
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};

/** Fields for a local Elasticsearch destination (`elasticsearch.schema.yaml`). */
export const LocalElasticsearchFields = (props: LocalElasticsearchFieldsProps) => {
  const { disabled } = props;
  const { control, setValue, resetField } = useFormContext<DestinationCreationFormData>();
  const elasticsearch = useWatch({ control, name: 'elasticsearch' });
  // Registered here rather than in the inputs, so `resetField` also clears hidden ones.
  const indexFields: IndexFields = {
    logs: useController({ control, name: getIndexFieldPath('logs') }).field,
    metrics: useController({ control, name: getIndexFieldPath('metrics') }).field,
    traces: useController({ control, name: getIndexFieldPath('traces') }).field,
  };
  const { field: customSignalsField } = useController({
    control,
    name: 'elasticsearch.customSignals',
  });
  const autoRadioId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationRoutingAuto' });
  const staticRadioId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationRoutingStatic' });

  const resetWriteTargets = () => {
    resetField('elasticsearch.customSignals');
    for (const signal of DESTINATION_SIGNALS) {
      resetField(getIndexFieldPath(signal));
    }
  };

  const onModeChange = (auto: boolean) => {
    if (auto === elasticsearch.auto) {
      return;
    }
    resetWriteTargets();
    resetField('elasticsearch.useCustomWritePatterns');
    resetField('elasticsearch.staticNaming');
    setValue('elasticsearch.auto', auto, { shouldDirty: true });
  };

  const writeTargetFieldsProps: WriteTargetFieldsProps = {
    ...props,
    elasticsearch,
    indexFields,
    customSignalsField,
    resetWriteTargets,
  };

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.streams.destinations.indexModeTitle', {
            defaultMessage: 'Index mode',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.streams.destinations.indexModeDescription', {
            defaultMessage: 'Let document metadata derive an index name, or set a fixed one.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={autoRadioId}
            name="streamsCreateDestinationRouting"
            label={DESTINATION_AUTO_MODE_LABEL}
            checked={elasticsearch.auto}
            disabled={disabled}
            onChange={() => onModeChange(true)}
            data-test-subj="streamsCreateDestinationAuto"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={staticRadioId}
            name="streamsCreateDestinationRouting"
            label={DESTINATION_FIXED_INDEX_MODE_LABEL}
            checked={!elasticsearch.auto}
            disabled={disabled}
            onChange={() => onModeChange(false)}
            data-test-subj="streamsCreateDestinationFixedIndex"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      {elasticsearch.auto ? (
        <AutoFields {...writeTargetFieldsProps} />
      ) : (
        <StaticFields {...writeTargetFieldsProps} />
      )}
    </>
  );
};
