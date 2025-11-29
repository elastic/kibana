/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFormLabel,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiTextTruncate,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-plugin/public';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsRoutingSelector } from './state_management/stream_routing_state_machine';

interface StreamNameFormRowProps {
  setLocalStreamName?: React.Dispatch<React.SetStateAction<string>>;
  readOnly?: boolean;
  autoFocus?: boolean;
  error?: string;
  isInvalid?: boolean;
  helpText?: string;
  dotErrorMessage?: JSX.Element | undefined;
  isStreamNameValid?: boolean;
  partitionName: string;
  prefix: string;
}

const MIN_NAME_LENGTH = 1;
const PREFIX_MAX_VISIBLE_CHARACTERS = 25;

export const getHelpText = (
  isStreamNameEmpty: boolean,
  isStreamNameTooLong: boolean,
  readOnly: boolean
): string | undefined => {
  if (isStreamNameEmpty && !readOnly) {
    return i18n.translate('xpack.streams.streamDetailRouting.minimumNameHelpText', {
      defaultMessage: `Stream name is required.`,
    });
  } else if (isStreamNameTooLong && !readOnly) {
    return i18n.translate('xpack.streams.streamDetailRouting.maximumNameHelpText', {
      defaultMessage: `Stream name cannot be longer than {maxLength} characters.`,
      values: {
        maxLength: MAX_STREAM_NAME_LENGTH,
      },
    });
  } else {
    return undefined;
  }
};

interface ChildStreamInputHookResponse {
  localStreamName: string;
  setLocalStreamName: React.Dispatch<React.SetStateAction<string>>;
  isStreamNameValid: boolean;
  prefix: string;
  partitionName: string;
  helpText: string | undefined;
  dotErrorMessage: JSX.Element | undefined;
}

/**
 * Custom hook that handles computations necessary for child stream input component instances.
 * TODO: finish jsdoc for this hook
 */
export const useChildStreamInput = (
  streamName: string,
  readOnly: boolean = false,
  onChange: (value: string) => void = () => {}
): ChildStreamInputHookResponse => {
  const [localStreamName, setLocalStreamName] = useState(streamName);
  useDebounce(
    () => {
      onChange(localStreamName);
    },
    500,
    [localStreamName]
  );

  const router = useStreamsAppRouter();
  const parentStreamName = useStreamsRoutingSelector((snapshot) => snapshot.context.definition)
    .stream.name;

  const prefix = parentStreamName + '.';
  const partitionName = localStreamName.replace(prefix, '');
  const rootChild = partitionName.split('.')[0];

  const isStreamNameEmpty = localStreamName.length <= prefix.length;
  const isStreamNameTooLong = localStreamName.length > MAX_STREAM_NAME_LENGTH;
  const isLengthValid = !isStreamNameEmpty && !isStreamNameTooLong;

  const helpText = getHelpText(isStreamNameEmpty, isStreamNameTooLong, readOnly);

  const isDotPresent = !readOnly && partitionName.includes('.');
  // TODO: add a check to see if the root child stream exists already, put a new error message if it does and move this logic into a helper function
  const dotErrorMessage = isDotPresent ? (
    <FormattedMessage
      id="xpack.streams.streamDetailRouting.nameContainsDotErrorMessage"
      defaultMessage={`Stream name cannot contain the "." character. Open the stream {childStreamLink} and create the child there.`}
      values={{
        childStreamLink: (
          <EuiLink
            data-test-subj="streamsAppChildStreamLink"
            external
            target="_blank"
            href={router.link('/{key}', { path: { key: prefix + rootChild } })}
          >
            {prefix + rootChild}
          </EuiLink>
        ),
      }}
    />
  ) : undefined;

  return {
    localStreamName,
    setLocalStreamName,
    isStreamNameValid: isLengthValid && !isDotPresent,
    prefix,
    partitionName,
    helpText,
    dotErrorMessage,
  };
};

export function StreamNameFormRow({
  setLocalStreamName = () => {},
  readOnly = false,
  autoFocus = false,
  error,
  isInvalid = false,
  helpText,
  dotErrorMessage,
  isStreamNameValid = true,
  partitionName,
  prefix,
}: StreamNameFormRowProps) {
  const descriptionId = useGeneratedHtmlId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPartitionName = e.target.value;
    setLocalStreamName(`${prefix}${newPartitionName}`);
  };

  return (
    <EuiFormRow
      fullWidth
      label={
        <span data-test-subj="streamsAppRoutingStreamNameLabel">
          {i18n.translate('xpack.streams.streamDetailRouting.name', {
            defaultMessage: 'Stream name',
          })}
        </span>
      }
      helpText={helpText}
      describedByIds={[descriptionId]}
      isInvalid={isInvalid || !isStreamNameValid}
      error={error || dotErrorMessage}
    >
      <EuiFieldText
        isInvalid={isInvalid || !isStreamNameValid}
        data-test-subj="streamsAppRoutingStreamEntryNameField"
        value={partitionName}
        fullWidth
        compressed
        readOnly={readOnly}
        autoFocus={autoFocus}
        onChange={handleChange}
        minLength={MIN_NAME_LENGTH}
        prepend={[
          <EuiIcon type="streamsWired" />,
          <EuiFormLabel
            css={css`
              inline-size: min(${prefix.length}ch, ${PREFIX_MAX_VISIBLE_CHARACTERS}ch);
            `}
            id={descriptionId}
            data-test-subj="streamsAppRoutingStreamNamePrefix"
          >
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('xpack.streams.streamDetailRouting.screenReaderPrefixLabel', {
                  defaultMessage: 'Stream prefix:',
                })}
              </span>
            </EuiScreenReaderOnly>
            <EuiTextTruncate text={prefix} truncation="start" data-test-subj={`streamNamePrefix`} />
          </EuiFormLabel>,
        ]}
      />
    </EuiFormRow>
  );
}
