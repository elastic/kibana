/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  MAX_OTEL_DATA_STREAM_NAME_BYTES,
  MAX_OTEL_DATA_STREAM_PART_LENGTH,
} from '@kbn/streams-schema';
import { MAX_RESOLVE_INDEX_PATTERNS } from '@kbn/streams-plugin/common';
import { MAX_INDEX_NAME_BYTES } from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import type {
  DestinationSignal,
  DocsWritePatternValidationError,
  FreeFormIndexValidationError,
  SignalIndexValidationError,
} from './types';

export type WriteTargetError =
  | FreeFormIndexValidationError
  | SignalIndexValidationError
  | DocsWritePatternValidationError
  | 'tooMany'
  | undefined;

const templateErrorText = (): string =>
  i18n.translate('xpack.streams.destinations.indexTemplateNotSupportedErrorMessage', {
    defaultMessage: 'Templated index names are not supported yet.',
  });

/** Text for a Fixed dataset and namespace error. Automatic write pattern errors have none here. */
export const otelNameErrorText = (
  error: SignalIndexValidationError | undefined
): string | undefined => {
  switch (error) {
    case 'namespaceRequired':
      return i18n.translate('xpack.streams.destinations.otelNamespaceRequiredErrorMessage', {
        defaultMessage: 'Enter a namespace.',
      });
    case 'template':
      return templateErrorText();
    case 'uppercase':
      return i18n.translate('xpack.streams.destinations.otelNameUppercaseErrorMessage', {
        defaultMessage: 'Dataset and namespace must be lowercase.',
      });
    case 'hyphen':
      return i18n.translate('xpack.streams.destinations.otelNameHyphenErrorMessage', {
        defaultMessage: 'Dataset and namespace cannot contain "-".',
      });
    case 'invalidCharacter':
      return i18n.translate('xpack.streams.destinations.otelNameInvalidCharacterErrorMessage', {
        defaultMessage:
          'Dataset and namespace cannot contain \\ / * ? " < > | , # : or spaces. Invisible characters are not allowed either.',
      });
    case 'invalidName':
      return i18n.translate('xpack.streams.destinations.otelNameInvalidNameErrorMessage', {
        defaultMessage: 'Dataset and namespace cannot be "." or "..".',
      });
    case 'partTooLong':
      return i18n.translate('xpack.streams.destinations.otelNamePartTooLongErrorMessage', {
        defaultMessage: 'Dataset and namespace can be at most {max} characters each.',
        values: { max: MAX_OTEL_DATA_STREAM_PART_LENGTH },
      });
    case 'tooLong':
      return i18n.translate('xpack.streams.destinations.otelNameTooLongErrorMessage', {
        defaultMessage:
          'Dataset and namespace are too long. Each data stream name, including the Prometheus one for metrics, can be at most {max} bytes.',
        values: { max: MAX_OTEL_DATA_STREAM_NAME_BYTES },
      });
    default:
      return undefined;
  }
};

export const writeTargetErrorText = (
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
    return templateErrorText();
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
    return i18n.translate('xpack.streams.destinations.docsIndexInvalidNameErrorMessage', {
      defaultMessage: 'Enter a valid index or data stream name.',
    });
  }
  if (error === 'tooLong') {
    return i18n.translate('xpack.streams.destinations.writePatternTooLongErrorMessage', {
      defaultMessage: 'Write patterns can be at most {max} bytes.',
      values: { max: MAX_INDEX_NAME_BYTES },
    });
  }
  if (error === 'tooMany') {
    return i18n.translate('xpack.streams.destinations.writePatternsTooManyErrorMessage', {
      defaultMessage: 'A destination can have at most {max} write patterns across all signals.',
      values: { max: MAX_RESOLVE_INDEX_PATTERNS },
    });
  }
  if (error === 'docsPrefix') {
    return i18n.translate('xpack.streams.destinations.docsWritePatternPrefixErrorMessage', {
      defaultMessage: 'Must start with logs-, metrics- or traces-.',
    });
  }
  return undefined;
};
