/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiIcon,
  EuiFormLabel,
  EuiScreenReaderOnly,
  EuiTextTruncate,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useStreamsRoutingSelector } from './state_management/stream_routing_state_machine';

interface StreamNameFormRowProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  error?: string;
  isInvalid?: boolean;
}

const MAX_NAME_LENGTH = 200;
const PREFIX_MAX_VISIBLE_CHARACTERS = 25;

export function StreamNameFormRow({
  value,
  onChange = () => {},
  readOnly = false,
  autoFocus = false,
  error,
  isInvalid = false,
}: StreamNameFormRowProps) {
  const descriptionId = useGeneratedHtmlId();

  const parentStreamName = useStreamsRoutingSelector((snapshot) => snapshot.context.definition)
    .stream.name;

  const prefix = parentStreamName + '.';
  const partitionName = value.replace(prefix, '');

  const isLengthValid = value.length > prefix.length && value.length <= MAX_NAME_LENGTH;

  const helpText =
    value.length >= MAX_NAME_LENGTH && !readOnly
      ? i18n.translate('xpack.streams.streamDetailRouting.maximumNameHelpText', {
          defaultMessage: `Stream name cannot be longer than {maxLength} characters.`,
          values: {
            maxLength: MAX_NAME_LENGTH,
          },
        })
      : value.length <= prefix.length && !readOnly
      ? i18n.translate('xpack.streams.streamDetailRouting.minimumNameHelpText', {
          defaultMessage: `Stream name is required.`,
        })
      : undefined;

  const isDotPresent = !readOnly && partitionName.includes('.');
  const dotErrorMessage = isDotPresent
    ? i18n.translate('xpack.streams.streamDetailRouting.nameContainsDotErrorMessage', {
        defaultMessage: `Stream name cannot contain the "." character.`,
      })
    : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPartitionName = e.target.value;

    onChange(`${prefix}${newPartitionName}`);
  };

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.streams.streamDetailRouting.name', {
        defaultMessage: 'Stream name',
      })}
      helpText={helpText}
      describedByIds={[descriptionId]}
      isInvalid={isInvalid || isDotPresent || !isLengthValid}
      error={error || dotErrorMessage}
    >
      <EuiFieldText
        isInvalid={isInvalid || isDotPresent || !isLengthValid}
        data-test-subj="streamsAppRoutingStreamEntryNameField"
        value={partitionName}
        fullWidth
        compressed
        readOnly={readOnly}
        autoFocus={autoFocus}
        onChange={handleChange}
        maxLength={MAX_NAME_LENGTH - prefix.length}
        prepend={[
          <EuiIcon type="streamsWired" />,
          <EuiFormLabel
            css={css`
              inline-size: min(${prefix.length}ch, ${PREFIX_MAX_VISIBLE_CHARACTERS}ch);
            `}
            id={descriptionId}
          >
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('xpack.streams.streamDetailRouting.screenReaderPrefixLabel', {
                  defaultMessage: 'Stream prefix:',
                })}
              </span>
            </EuiScreenReaderOnly>
            <EuiTextTruncate text={prefix} truncation="start" />
          </EuiFormLabel>,
        ]}
      />
    </EuiFormRow>
  );
}
