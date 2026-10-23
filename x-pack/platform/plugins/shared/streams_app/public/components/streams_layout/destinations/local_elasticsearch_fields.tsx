/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormPrepend,
  EuiFormRow,
  EuiRadio,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
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
import {
  DESTINATION_AUTO_MODE_LABEL,
  DESTINATION_FIXED_INDEX_MODE_LABEL,
  DESTINATION_SIGNAL_LABELS,
} from './destination_type_config';
import type {
  AutoWritePatternValidationError,
  DestinationCreationFormErrors,
  DestinationSignal,
  ElasticsearchDestinationFormData,
  StaticIndexValidationError,
} from './types';

type IndexScope = 'all' | DestinationSignal;
type WriteTargetError = StaticIndexValidationError | AutoWritePatternValidationError | undefined;

interface LocalElasticsearchFieldsProps {
  auto: boolean;
  logsIndex: string;
  metricsIndex: string;
  tracesIndex: string;
  staticIndexesError?: DestinationCreationFormErrors['staticIndexes'];
  logsIndexError?: WriteTargetError;
  metricsIndexError?: WriteTargetError;
  tracesIndexError?: WriteTargetError;
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

/** Spacer + signal group + field + help/error, so the dialog does not jump. */
const STATIC_INDEX_FIELDS_MIN_HEIGHT = 196;

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

const writeTargetErrorText = (
  signal: DestinationSignal,
  error: WriteTargetError,
  allowWildcard: boolean
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
    return allowWildcard
      ? i18n.translate('xpack.streams.destinations.writeTargetInvalidCharacterErrorMessage', {
          defaultMessage: 'Write targets cannot contain \\ / ? " < > | , # : or spaces.',
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
  const autoRadioId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationRoutingAuto' });
  const staticRadioId = useGeneratedHtmlId({ prefix: 'streamsCreateDestinationRoutingStatic' });
  const [indexScope, setIndexScope] = useState<IndexScope>(ALL_SCOPE);
  const [showWriteTargets, setShowWriteTargets] = useState(false);

  const indexesBySignal: Record<DestinationSignal, string> = {
    logs: logsIndex,
    metrics: metricsIndex,
    traces: tracesIndex,
  };
  const errorsBySignal: Record<DestinationSignal, WriteTargetError> = {
    logs: logsIndexError,
    metrics: metricsIndexError,
    traces: tracesIndexError,
  };

  const remainder =
    indexScope === ALL_SCOPE
      ? getStaticIndexRemainder('logs', logsIndex)
      : getStaticIndexRemainder(indexScope, indexesBySignal[indexScope]);
  const visibleSignal: DestinationSignal = indexScope === ALL_SCOPE ? 'logs' : indexScope;
  const fieldError = writeTargetErrorText(visibleSignal, errorsBySignal[visibleSignal], auto);
  const requiredError =
    !auto && staticIndexesError === 'required'
      ? i18n.translate('xpack.streams.destinations.staticIndexRequiredErrorMessage', {
          defaultMessage: 'Enter at least one index.',
        })
      : undefined;
  const otherInvalidSignals = DESTINATION_SIGNALS.filter(
    (signal) =>
      signal !== visibleSignal && writeTargetErrorText(signal, errorsBySignal[signal], auto)
  );
  const otherSignalsError =
    otherInvalidSignals.length > 0
      ? i18n.translate('xpack.streams.destinations.otherSignalWriteTargetErrorMessage', {
          defaultMessage: 'Fix the {signals} {count, plural, one {value} other {values}}.',
          values: {
            signals: otherInvalidSignals
              .map((signal) => DESTINATION_SIGNAL_LABELS[signal])
              .join(', '),
            count: otherInvalidSignals.length,
          },
        })
      : undefined;
  const errorMessage = fieldError ?? requiredError ?? otherSignalsError;
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

  const clearWriteTargets = () => {
    setIndexScope(ALL_SCOPE);
    onIndexesChange({ logsIndex: '', metricsIndex: '', tracesIndex: '' });
  };

  const onRoutingChange = (nextAuto: boolean) => {
    onAutoChange(nextAuto);
    if (nextAuto) {
      setShowWriteTargets(false);
      clearWriteTargets();
    }
  };

  const onShowWriteTargetsChange = (checked: boolean) => {
    setShowWriteTargets(checked);
    if (!checked) {
      clearWriteTargets();
    }
  };

  const showIndexFields = !auto || showWriteTargets;

  const indexHelpText = auto
    ? indexScope === ALL_SCOPE
      ? i18n.translate('xpack.streams.destinations.autoAllWriteTargetHelpDescription', {
          defaultMessage:
            'Optional. Leave blank to write to logs-*-*, metrics-*-*, and traces-*-*. Use * as a wildcard.',
        })
      : i18n.translate('xpack.streams.destinations.autoSignalWriteTargetHelpDescription', {
          defaultMessage:
            'Optional. Leave blank to skip this signal. Use * as a wildcard. Must match {pattern}.',
          values: { pattern: `${indexScope}-*-*` },
        })
    : indexScope === ALL_SCOPE
    ? i18n.translate('xpack.streams.destinations.allSignalsIndexHelpDescription', {
        defaultMessage:
          'The same name is applied to logs, metrics, and traces as type-dataset-namespace.',
      })
    : i18n.translate('xpack.streams.destinations.signalIndexHelpDescription', {
        defaultMessage: 'Optional. Leave blank to skip this signal. Must match {pattern}.',
        values: { pattern: `${indexScope}-*-*` },
      });

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.streams.destinations.routingTitle', {
            defaultMessage: 'Routing',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={autoRadioId}
            name="streamsCreateDestinationRouting"
            label={DESTINATION_AUTO_MODE_LABEL}
            checked={auto}
            disabled={disabled}
            onChange={() => onRoutingChange(true)}
            data-test-subj="streamsCreateDestinationAuto"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={staticRadioId}
            name="streamsCreateDestinationRouting"
            label={DESTINATION_FIXED_INDEX_MODE_LABEL}
            checked={!auto}
            disabled={disabled}
            onChange={() => onRoutingChange(false)}
            data-test-subj="streamsCreateDestinationFixedIndex"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {auto && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.destinations.autoRoutingHelpDescription', {
                defaultMessage:
                  "Use each document's target, or derive a data stream name from its metadata.",
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={i18n.translate('xpack.streams.destinations.setWriteTargetsSwitchLabel', {
              defaultMessage: 'Set write targets',
            })}
            checked={showWriteTargets}
            disabled={disabled}
            onChange={(event) => onShowWriteTargetsChange(event.target.checked)}
            data-test-subj="streamsCreateDestinationSetWriteTargets"
          />
        </>
      )}
      {showIndexFields && (
        <div
          css={css`
            min-block-size: ${STATIC_INDEX_FIELDS_MIN_HEIGHT}px;
          `}
        >
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
            label={
              auto
                ? i18n.translate('xpack.streams.destinations.writeTargetLabel', {
                    defaultMessage: 'Write target',
                  })
                : i18n.translate('xpack.streams.destinations.staticIndexLabel', {
                    defaultMessage: 'Index',
                  })
            }
            helpText={indexHelpText}
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
        </div>
      )}
    </>
  );
};
