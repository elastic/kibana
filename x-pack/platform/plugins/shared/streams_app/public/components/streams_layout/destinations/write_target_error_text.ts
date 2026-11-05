/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_RESOLVE_INDEX_PATTERNS } from '@kbn/streams-plugin/common';
import { MAX_INDEX_NAME_BYTES } from './destination_models';
import { DESTINATION_SIGNAL_LABELS } from './destination_type_config';
import type {
  AutoWritePatternValidationError,
  DestinationSignal,
  DocsWritePatternValidationError,
  StaticIndexValidationError,
} from './types';

export type WriteTargetError =
  | StaticIndexValidationError
  | AutoWritePatternValidationError
  | DocsWritePatternValidationError
  | 'tooMany'
  | undefined;

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
    return signal === 'docs'
      ? i18n.translate('xpack.streams.destinations.docsIndexInvalidNameErrorMessage', {
          defaultMessage: 'Enter a valid index or data stream name.',
        })
      : i18n.translate('xpack.streams.destinations.indexInvalidNameErrorMessage', {
          defaultMessage: 'Enter a valid data stream name.',
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
