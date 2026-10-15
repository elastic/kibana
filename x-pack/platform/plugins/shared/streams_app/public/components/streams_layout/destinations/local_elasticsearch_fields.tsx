/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiFieldText,
  EuiFormPrepend,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DESTINATION_SIGNALS,
  composeStaticIndex,
  composeStaticIndexesForAll,
  getStaticIndexRemainder,
  haveStaticIndexRemaindersDiverged,
  SIGNAL_INDEX_FIELDS,
} from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import type {
  DestinationCreationFormErrors,
  DestinationSignal,
  ElasticsearchDestinationFormData,
  StaticIndexValidationError,
} from './types';

type IndexScope = 'all' | DestinationSignal;

interface LocalElasticsearchFieldsProps {
  auto: boolean;
  logsIndex: string;
  metricsIndex: string;
  tracesIndex: string;
  staticIndexesError?: DestinationCreationFormErrors['staticIndexes'];
  logsIndexError?: DestinationCreationFormErrors['logsIndex'];
  metricsIndexError?: DestinationCreationFormErrors['metricsIndex'];
  tracesIndexError?: DestinationCreationFormErrors['tracesIndex'];
  disabled: boolean;
  onAutoChange: (auto: boolean) => void;
  onIndexesChange: (
    indexes: Partial<
      Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
    >
  ) => void;
  onBlur: () => void;
}

const ALL_SCOPE: IndexScope = 'all';

const ALL_PREPEND = i18n.translate('xpack.streams.destinations.allSignalsPrependLabel', {
  defaultMessage: 'logs / metrics / traces',
});

const ALL_DISABLED_TOOLTIP = i18n.translate(
  'xpack.streams.destinations.allSignalsDisabledTooltip',
  {
    defaultMessage: 'All is unavailable after a signal-specific index is set.',
  }
);

const INDEX_PLACEHOLDER = i18n.translate('xpack.streams.destinations.staticIndexPlaceholder', {
  defaultMessage: 'dataset-namespace',
});

const INDEX_FIELD_TEST_SUBJ: Record<IndexScope, string> = {
  all: 'streamsCreateDestinationIndex',
  logs: 'streamsCreateDestinationLogsIndex',
  metrics: 'streamsCreateDestinationMetricsIndex',
  traces: 'streamsCreateDestinationTracesIndex',
};

const staticIndexErrorText = (
  signal: DestinationSignal,
  error: StaticIndexValidationError | undefined
): string | undefined => {
  if (error === 'template') {
    return i18n.translate('xpack.streams.destinations.indexTemplateNotSupportedErrorMessage', {
      defaultMessage: 'Templated index names are not supported yet.',
    });
  }
  if (error === 'uppercase') {
    return i18n.translate('xpack.streams.destinations.indexUppercaseErrorMessage', {
      defaultMessage: 'Index names must be lowercase.',
    });
  }
  if (error === 'invalidCharacter') {
    return i18n.translate('xpack.streams.destinations.indexInvalidCharacterErrorMessage', {
      defaultMessage: 'Index names cannot contain \\ / * ? " < > | , # : or spaces.',
    });
  }
  if (error === 'signalPattern') {
    return i18n.translate('xpack.streams.destinations.indexSignalPatternErrorMessage', {
      defaultMessage: 'Must be a data stream name matching {pattern}.',
      values: { pattern: `${signal}-*-*` },
    });
  }
  if (error === 'invalidName') {
    return i18n.translate('xpack.streams.destinations.indexInvalidNameErrorMessage', {
      defaultMessage: 'Enter a valid data stream name.',
    });
  }
  return undefined;
};

/** Fields for a local Elasticsearch destination (`elasticsearch.schema.yaml`). */
export const LocalElasticsearchFields = ({
  auto,
  logsIndex,
  metricsIndex,
  tracesIndex,
  staticIndexesError,
  logsIndexError,
  metricsIndexError,
  tracesIndexError,
  disabled,
  onAutoChange,
  onIndexesChange,
  onBlur,
}: LocalElasticsearchFieldsProps) => {
  const [indexScope, setIndexScope] = useState<IndexScope>(ALL_SCOPE);
  const [hasIndexFieldBeenBlurred, setHasIndexFieldBeenBlurred] = useState(false);

  useEffect(() => {
    if (auto) {
      setIndexScope(ALL_SCOPE);
      setHasIndexFieldBeenBlurred(false);
    }
  }, [auto]);

  const indexesBySignal: Record<DestinationSignal, string> = {
    logs: logsIndex,
    metrics: metricsIndex,
    traces: tracesIndex,
  };
  const errorsBySignal: Record<DestinationSignal, StaticIndexValidationError | undefined> = {
    logs: logsIndexError,
    metrics: metricsIndexError,
    traces: tracesIndexError,
  };

  const remainder =
    indexScope === ALL_SCOPE
      ? getStaticIndexRemainder('logs', logsIndex)
      : getStaticIndexRemainder(indexScope, indexesBySignal[indexScope]);
  const visibleSignal: DestinationSignal = indexScope === ALL_SCOPE ? 'logs' : indexScope;
  const fieldError = staticIndexErrorText(visibleSignal, errorsBySignal[visibleSignal]);
  const requiredError =
    hasIndexFieldBeenBlurred && staticIndexesError === 'required'
      ? i18n.translate('xpack.streams.destinations.staticIndexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;
  const errorMessage = fieldError ?? requiredError;
  const isAllDisabled = haveStaticIndexRemaindersDiverged({
    logsIndex,
    metricsIndex,
    tracesIndex,
  });

  const scopeOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: ALL_SCOPE,
        label: i18n.translate('xpack.streams.destinations.allSignalsButtonLabel', {
          defaultMessage: 'All',
        }),
        isDisabled: isAllDisabled,
        title: '',
        toolTipContent: isAllDisabled ? ALL_DISABLED_TOOLTIP : undefined,
        'data-test-subj': 'streamsCreateDestinationIndexScope-all',
      },
      ...DESTINATION_SIGNALS.map((signal) => ({
        id: signal,
        label: DESTINATION_SIGNAL_LABELS[signal],
        'data-test-subj': `streamsCreateDestinationIndexScope-${signal}`,
      })),
    ],
    [isAllDisabled]
  );

  const onScopeChange = (nextScope: string) => {
    if (nextScope === ALL_SCOPE && isAllDisabled) {
      return;
    }
    setIndexScope(nextScope as IndexScope);
  };

  const onIndexBlur = () => {
    setHasIndexFieldBeenBlurred(true);
    onBlur();
  };

  const onRemainderChange = (nextRemainder: string) => {
    if (indexScope === ALL_SCOPE) {
      onIndexesChange(composeStaticIndexesForAll(nextRemainder));
      return;
    }
    onIndexesChange({
      [SIGNAL_INDEX_FIELDS[indexScope]]: composeStaticIndex(indexScope, nextRemainder),
    });
  };

  return (
    <>
      <EuiFormRow
        fullWidth
        helpText={i18n.translate('xpack.streams.destinations.autoIndexHelpDescription', {
          defaultMessage:
            'When enabled, Elasticsearch creates data streams for logs, metrics, and traces from document metadata.',
        })}
      >
        <EuiSwitch
          compressed
          label={i18n.translate('xpack.streams.destinations.autoIndexLabel', {
            defaultMessage: 'Create indices automatically',
          })}
          checked={auto}
          disabled={disabled}
          onChange={(event) => onAutoChange(event.target.checked)}
          data-test-subj="streamsCreateDestinationAuto"
        />
      </EuiFormRow>
      {!auto && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonGroup
            legend={i18n.translate('xpack.streams.destinations.indexScopeLegend', {
              defaultMessage: 'Index signals',
            })}
            buttonSize="compressed"
            isFullWidth
            isDisabled={disabled}
            options={scopeOptions}
            idSelected={indexScope}
            onChange={onScopeChange}
            data-test-subj="streamsCreateDestinationIndexScope"
          />
          <EuiSpacer size="s" />
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.streams.destinations.staticIndexLabel', {
              defaultMessage: 'Index',
            })}
            helpText={
              indexScope === ALL_SCOPE
                ? i18n.translate('xpack.streams.destinations.allSignalsIndexHelpDescription', {
                    defaultMessage:
                      'The same name is applied to logs, metrics, and traces as type-dataset-namespace.',
                  })
                : i18n.translate('xpack.streams.destinations.signalIndexHelpDescription', {
                    defaultMessage:
                      'Optional. Leave blank to skip this signal. Must match {pattern}.',
                    values: { pattern: `${indexScope}-*-*` },
                  })
            }
            isInvalid={Boolean(errorMessage)}
            error={errorMessage}
          >
            <EuiFieldText
              fullWidth
              value={remainder}
              disabled={disabled}
              isInvalid={Boolean(errorMessage)}
              prepend={
                <EuiFormPrepend label={indexScope === ALL_SCOPE ? ALL_PREPEND : `${indexScope}-`} />
              }
              onChange={(event) => onRemainderChange(event.target.value)}
              onBlur={onIndexBlur}
              placeholder={INDEX_PLACEHOLDER}
              data-test-subj={INDEX_FIELD_TEST_SUBJ[indexScope]}
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
};
