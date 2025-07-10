/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';
import { GenerationErrorCode } from '../../../common/constants';

interface UnsupportedLogFormat {
  message: string;
  logFormat?: string;
}

interface UnsupportedLogFormatResponseBody {
  message: string;
  attributes: {
    errorCode: string;
    logFormat?: string;
  };
}

export class UnsupportedLogFormatError extends Error implements ErrorThatHandlesItsOwnResponse {
  private readonly errorCode: string = GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT;
  private logFormat: string | undefined;

  constructor(unsupportedLogFormat: UnsupportedLogFormat) {
    super(unsupportedLogFormat.message);
    if (unsupportedLogFormat.logFormat) {
      this.logFormat = unsupportedLogFormat.logFormat;
    }
  }

  public sendResponse(res: KibanaResponseFactory) {
    const responseBody: UnsupportedLogFormatResponseBody = {
      message: this.message,
      attributes: {
        errorCode: this.errorCode,
      },
    };

    if (this.logFormat) {
      responseBody.attributes.logFormat = this.logFormat;
    }

    return res.customError({
      statusCode: 501,
      body: responseBody,
    });
  }
}
