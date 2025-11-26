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

export interface StreamNameFormRowProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  error?: string;
  isInvalid?: boolean;
  parentStreamName?: string;
  nestedStreamNameAllowed?: boolean;
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
  nestedStreamNameAllowed = false,
  parentStreamName,
}: StreamNameFormRowProps) {
  const descriptionId = useGeneratedHtmlId();

  const prefix = parentStreamName ? parentStreamName + '.' : parentStreamName;
  const partitionName = prefix ? value.replace(prefix, '') : value;
  const isLessThanMaxLength = value.length <= MAX_NAME_LENGTH;

  const isLengthValid = prefix
    ? isLessThanMaxLength && value.length > prefix.length
    : isLessThanMaxLength;

  const helpText =
    value.length >= MAX_NAME_LENGTH && !readOnly
      ? i18n.translate('xpack.streams.streamDetailRouting.maximumNameHelpText', {
          defaultMessage: `Stream name cannot be longer than {maxLength} characters.`,
          values: {
            maxLength: MAX_NAME_LENGTH,
          },
        })
      : value === prefix && !readOnly
      ? i18n.translate('xpack.streams.streamDetailRouting.minimumNameHelpText', {
          defaultMessage: `Stream name is required.`,
        })
      : undefined;

  const isDotPresent = !nestedStreamNameAllowed && !readOnly && partitionName.includes('.');
  const dotErrorMessage = isDotPresent
    ? i18n.translate('xpack.streams.streamDetailRouting.nameContainsDotErrorMessage', {
        defaultMessage: `Stream name cannot contain the "." character.`,
      })
    : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPartitionName = e.target.value;

    if (prefix) {
      onChange(`${prefix}${newPartitionName}`);
    } else {
      onChange(newPartitionName);
    }
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
        maxLength={prefix ? MAX_NAME_LENGTH - prefix.length : MAX_NAME_LENGTH}
        prepend={
          prefix
            ? [
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
              ]
            : undefined
        }
      />
    </EuiFormRow>
  );
}
