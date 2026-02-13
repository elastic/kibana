/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFormRow,
  EuiComboBox,
  EuiCallOut,
  EuiSkeletonText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamMetricsSerializedState } from '../embeddable/types';

export interface StreamConfigurationProps {
  initialState?: StreamMetricsSerializedState;
  streamsRepositoryClient: StreamsRepositoryClient;
  onCreate: (state: StreamMetricsSerializedState) => void;
  onCancel: () => void;
}

export function StreamConfiguration({
  initialState,
  streamsRepositoryClient,
  onCreate,
  onCancel,
}: StreamConfigurationProps) {
  const [selectedStreamName, setSelectedStreamName] = useState<string | undefined>(
    initialState?.streamName
  );
  const [hasError, setHasError] = useState(false);

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'streamConfigurationFlyout',
  });

  const onConfirmClick = () => {
    if (!selectedStreamName) {
      setHasError(true);
      return;
    }

    onCreate({
      streamName: selectedStreamName,
    });
  };

  return (
    <EuiFlyout
      data-test-subj="streamMetricsConfiguration"
      onClose={onCancel}
      aria-labelledby={flyoutTitleId}
      size="s"
    >
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>
            {i18n.translate('xpack.streams.streamMetricsEmbeddable.config.headerTitle', {
              defaultMessage: 'Stream metrics configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <StreamSelector
              streamsRepositoryClient={streamsRepositoryClient}
              selectedStreamName={selectedStreamName}
              onSelect={(name) => {
                setSelectedStreamName(name);
                setHasError(name === undefined);
              }}
              hasError={hasError && !selectedStreamName}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onCancel} data-test-subj="streamMetricsCancelButton">
            <FormattedMessage
              id="xpack.streams.streamMetricsEmbeddable.config.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="streamMetricsConfirmButton"
            isDisabled={!selectedStreamName || hasError}
            onClick={onConfirmClick}
            fill
          >
            <FormattedMessage
              id="xpack.streams.streamMetricsEmbeddable.config.confirmButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

interface StreamSelectorProps {
  streamsRepositoryClient: StreamsRepositoryClient;
  selectedStreamName: string | undefined;
  onSelect: (name: string | undefined) => void;
  hasError: boolean;
}

function StreamSelector({
  streamsRepositoryClient,
  selectedStreamName,
  onSelect,
  hasError,
}: StreamSelectorProps) {
  const {
    data: streamsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['streamsList'],
    queryFn: async ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams', { signal: signal ?? null });
    },
  });

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    if (!streamsData?.streams) {
      return [];
    }
    return streamsData.streams.map(({ stream }) => ({
      label: stream.name,
      value: stream.name,
      'data-test-subj': `stream-option-${stream.name}`,
    }));
  }, [streamsData]);

  const selectedOptions = useMemo(() => {
    if (!selectedStreamName) return [];
    return options.filter((option) => option.value === selectedStreamName);
  }, [selectedStreamName, options]);

  const handleChange = (newSelectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedOption = newSelectedOptions[0];
    onSelect(selectedOption?.value);
  };

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.streams.streamMetricsEmbeddable.config.loadError', {
          defaultMessage: 'Failed to load streams',
        })}
        color="danger"
        iconType="error"
      >
        {(error as Error).message}
      </EuiCallOut>
    );
  }

  if (isLoading) {
    return <EuiSkeletonText lines={3} />;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.streamMetricsEmbeddable.config.streamLabel', {
        defaultMessage: 'Stream',
      })}
      isInvalid={hasError}
      error={
        hasError
          ? i18n.translate('xpack.streams.streamMetricsEmbeddable.config.streamRequired', {
              defaultMessage: 'Please select a stream',
            })
          : undefined
      }
    >
      <EuiComboBox
        data-test-subj="streamMetricsStreamSelector"
        placeholder={i18n.translate(
          'xpack.streams.streamMetricsEmbeddable.config.streamPlaceholder',
          {
            defaultMessage: 'Select a stream',
          }
        )}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        singleSelection={{ asPlainText: true }}
        isInvalid={hasError}
        isClearable
        fullWidth
      />
    </EuiFormRow>
  );
}
