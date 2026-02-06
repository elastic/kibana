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
import { FormattedMessage } from '@kbn/i18n-react';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-plugin/public';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import type { StatefulStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useStreamsRoutingSelector } from './state_management/stream_routing_state_machine';

interface StreamNameFormRowProps {
  onChange?: (value: string) => void;
  setLocalStreamName?: React.Dispatch<React.SetStateAction<string>>;
  readOnly?: boolean;
  autoFocus?: boolean;
  error?: string;
  isInvalid?: boolean;
  helpText?: string;
  errorMessage?: ReactNode | string | undefined;
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

export const getErrorMessage = (
  containsUpperCaseChars: boolean,
  containsSpaces: boolean,
  isDuplicatedName: boolean,
  rootChildExists: boolean,
  isDotPresent: boolean,
  prefix: string,
  rootChild: string,
  router: StatefulStreamsAppRouter
): ReactNode | string | undefined => {
  if (containsUpperCaseChars) {
    return i18n.translate('xpack.streams.streamDetailRouting.uppercaseCharsError', {
      defaultMessage: 'Stream name cannot contain uppercase characters.',
    });
  }
  if (containsSpaces) {
    return i18n.translate('xpack.streams.streamDetailRouting.containsSpacesError', {
      defaultMessage: 'Stream name cannot contain spaces.',
    });
  }
  if (isDuplicatedName) {
    return i18n.translate('xpack.streams.streamDetailRouting.nameConflictError', {
      defaultMessage: 'A stream with this name already exists',
    });
  }
  if (isDotPresent && !rootChildExists) {
    return i18n.translate('xpack.streams.streamDetailRouting.rootChildDoesNotExistError', {
      defaultMessage: `The child stream {rootChild} does not exist. Please create it first.`,
      values: {
        rootChild: prefix + rootChild,
      },
    });
  }
  if (isDotPresent && rootChildExists) {
    return (
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
    );
  }

  return undefined;
};

interface ChildStreamInputHookResponse {
  localStreamName: string;
  setLocalStreamName: React.Dispatch<React.SetStateAction<string>>;
  isStreamNameValid: boolean;
  prefix: string;
  partitionName: string;
  helpText: string | undefined;
  errorMessage: ReactNode | string | undefined;
}

/**
 * Custom hook that handles computations necessary for child stream input component instances.
 * Used by parent components to lift up the states needed for the local input field so validation concerns can be shared across components.
 * @param streamName - The stream name to use for the local input field.
 * @param readOnly - Whether the input field is read only.
 * @returns An object containing local states, input validation flags, and help/error messages.
 * @example
 * const { localStreamName, setLocalStreamName, isStreamNameValid, prefix, partitionName, helpText, errorMessage } = useChildStreamInput('logs.linux');
 * return (
 *   <StreamNameFormRow
 *     localStreamName={localStreamName}
 *     setLocalStreamName={setLocalStreamName}
 *     isStreamNameValid={isStreamNameValid}
 *     prefix={prefix}
 *     partitionName={partitionName}
 *     helpText={helpText}
 *     errorMessage={errorMessage}
 *   />
 * );
 */
export const useChildStreamInput = (
  streamName: string,
  readOnly: boolean = false
): ChildStreamInputHookResponse => {
  const [localStreamName, setLocalStreamName] = useState(streamName);

  const router = useStreamsAppRouter();
  const parentStreamName = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );
  const routing = useStreamsRoutingSelector((snapshot) => snapshot.context.routing);

  const prefix = parentStreamName + '.';
  const partitionName = localStreamName.replace(prefix, '');
  const rootChild = partitionName.split('.')[0];
  const isDuplicatedName = useMemo(
    () => routing.some((r) => r.destination === localStreamName && !r.isNew),
    [routing, localStreamName]
  );
  const rootChildExists = useMemo(
    () => routing.some((r) => r.destination === prefix + rootChild && !r.isNew),
    [routing, prefix, rootChild]
  );

  const isStreamNameEmpty = localStreamName.length <= prefix.length;
  const isStreamNameTooLong = localStreamName.length > MAX_STREAM_NAME_LENGTH;
  const isLengthValid = !isStreamNameEmpty && !isStreamNameTooLong;
  const containsUpperCaseChars = localStreamName !== localStreamName.toLowerCase();
  const containsSpaces = localStreamName.includes(' ');

  const helpText = getHelpText(isStreamNameEmpty, isStreamNameTooLong, readOnly);

  const isDotPresent = !readOnly && partitionName.includes('.');

  const errorMessage = getErrorMessage(
    containsUpperCaseChars,
    containsSpaces,
    isDuplicatedName,
    rootChildExists,
    isDotPresent,
    prefix,
    rootChild,
    router
  );

  return {
    localStreamName,
    setLocalStreamName,
    isStreamNameValid:
      isLengthValid &&
      !isDotPresent &&
      !isDuplicatedName &&
      !containsUpperCaseChars &&
      !containsSpaces,
    prefix,
    partitionName,
    helpText,
    errorMessage,
  };
};

export function StreamNameFormRow({
  onChange = (value: string) => {},
  setLocalStreamName = () => {},
  readOnly = false,
  autoFocus = false,
  error,
  isInvalid = false,
  helpText,
  errorMessage,
  isStreamNameValid = true,
  partitionName,
  prefix,
}: StreamNameFormRowProps) {
  const descriptionId = useGeneratedHtmlId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPartitionName = e.target.value;
    setLocalStreamName(`${prefix}${newPartitionName}`);
    onChange(`${prefix}${newPartitionName}`);
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
      error={error || errorMessage}
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
