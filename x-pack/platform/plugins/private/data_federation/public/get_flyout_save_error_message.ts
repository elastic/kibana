/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/core-http-browser';

const ROOT_CAUSES_MARKER = 'Root causes:';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const flyoutSaveErrorTitle = () =>
  i18n.translate('xpack.dataFederation.errors.saveErrorTitle', {
    defaultMessage: 'Unable to save',
  });

const unknownErrorMessage = () =>
  i18n.translate('xpack.dataFederation.errors.unknown', {
    defaultMessage: 'Unknown error',
  });

const elasticsearchErrorTypeLabels: Record<string, () => string> = {
  action_request_validation_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.actionRequestValidationException', {
      defaultMessage: 'Request validation failed',
    }),
  illegal_argument_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.illegalArgumentException', {
      defaultMessage: 'Invalid argument',
    }),
  index_not_found_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.indexNotFoundException', {
      defaultMessage: 'Index not found',
    }),
  mapper_parsing_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.mapperParsingException', {
      defaultMessage: 'Mapping parse failed',
    }),
  parsing_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.parsingException', {
      defaultMessage: 'Parsing failed',
    }),
  resource_not_found_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.resourceNotFoundException', {
      defaultMessage: 'Resource not found',
    }),
  security_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.securityException', {
      defaultMessage: 'Security error',
    }),
  status_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.statusException', {
      defaultMessage: 'Request failed',
    }),
  validation_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.validationException', {
      defaultMessage: 'Validation failed',
    }),
  verification_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.verificationException', {
      defaultMessage: 'Verification failed',
    }),
  x_content_parse_exception: () =>
    i18n.translate('xpack.dataFederation.errors.elasticsearch.xContentParseException', {
      defaultMessage: 'Failed to parse content',
    }),
};

const normalizeErrorText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const humanizeSnakeCase = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const getElasticsearchErrorTypeLabel = (errorType: string): string => {
  const label = elasticsearchErrorTypeLabels[errorType];
  if (label) {
    return label();
  }

  return humanizeSnakeCase(errorType);
};

const stripLeadingErrorType = (errorType: string, detail: string): string => {
  const trimmedDetail = detail.trim();
  const duplicatePrefix = `${errorType}:`;

  if (trimmedDetail.startsWith(duplicatePrefix)) {
    return trimmedDetail.slice(duplicatePrefix.length).trim();
  }

  return trimmedDetail;
};

export interface ParsedFlyoutSaveErrorMessage {
  errorType?: string;
  detail: string;
}

export const parseFlyoutSaveErrorMessage = (message: string): ParsedFlyoutSaveErrorMessage => {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return { detail: unknownErrorMessage() };
  }

  const rootCausesIndex = trimmedMessage.indexOf(ROOT_CAUSES_MARKER);
  if (rootCausesIndex !== -1) {
    const errorType = normalizeErrorText(trimmedMessage.slice(0, rootCausesIndex));
    const rawDetail = trimmedMessage.slice(rootCausesIndex + ROOT_CAUSES_MARKER.length);
    const detail = normalizeErrorText(stripLeadingErrorType(errorType, rawDetail));

    return {
      errorType: errorType || undefined,
      detail: detail || trimmedMessage,
    };
  }

  const [firstLine, ...remainingLines] = trimmedMessage.split(/\r?\n/);
  if (remainingLines.length > 0 && firstLine.trim()) {
    const errorType = firstLine.trim();
    return {
      errorType,
      detail: remainingLines.join('\n').trim(),
    };
  }

  return { detail: trimmedMessage };
};

export const formatFlyoutSaveErrorDetail = (detail: string): string => {
  let formatted = detail.trim();

  formatted = formatted.replace(/^Validation Failed:\s*\d+:\s*/i, '');
  formatted = formatted.replace(/^Root causes:\s*/i, '');

  return formatted.trim() || detail.trim();
};

export interface FlyoutSaveErrorCalloutContent {
  title: string;
  body: string;
}

export interface FormattedFlyoutSaveError extends FlyoutSaveErrorCalloutContent {
  toastText: string;
}

export const formatFlyoutSaveError = (message: string): FormattedFlyoutSaveError => {
  const parsed = parseFlyoutSaveErrorMessage(message);
  const title = parsed.errorType
    ? getElasticsearchErrorTypeLabel(parsed.errorType)
    : flyoutSaveErrorTitle();
  const body = formatFlyoutSaveErrorDetail(parsed.detail);

  return {
    title,
    body,
    toastText: body || title,
  };
};

export const formatFlyoutSaveErrorForCallout = (message: string): FlyoutSaveErrorCalloutContent => {
  const { title, body } = formatFlyoutSaveError(message);
  return { title, body };
};

const messageFromBody = (body: unknown): string | undefined => {
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (!isRecord(body)) {
    return undefined;
  }
  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message;
  }
  if (isRecord(body.error) && typeof body.error.reason === 'string' && body.error.reason.trim()) {
    return body.error.reason;
  }
  if (typeof body.reason === 'string' && body.reason.trim()) {
    return body.reason;
  }
  return undefined;
};

export const extractFlyoutSaveErrorMessage = (error: unknown): string => {
  if (isHttpFetchError(error)) {
    const fromBody = messageFromBody(error.body);
    if (fromBody) {
      return fromBody;
    }
    if (error.message.trim()) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  const fromUnknown = messageFromBody(error);
  if (fromUnknown) {
    return fromUnknown;
  }
  return unknownErrorMessage();
};

export const getFlyoutSaveErrorMessage = (error: unknown): string => {
  return formatFlyoutSaveError(extractFlyoutSaveErrorMessage(error)).toastText;
};
