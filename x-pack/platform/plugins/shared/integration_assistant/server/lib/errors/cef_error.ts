/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import {
  GenerationErrorAttributes,
  GenerationErrorBody,
} from '../../../common/api/generation_error';
import { ErrorThatHandlesItsOwnResponse } from './types';
import { GenerationErrorCode } from '../../../common/constants';

export class CefError extends Error implements ErrorThatHandlesItsOwnResponse {
  private readonly errorCode: GenerationErrorCode = GenerationErrorCode.CEF_ERROR;
  attributes: GenerationErrorAttributes;

  constructor(message: string) {
    super(message);
    this.attributes = {
      errorCode: this.errorCode,
      errorMessageWithLink: {
        linkText: 'cef-integration',
        link: 'https://www.elastic.co/docs/current/integrations/cef',
        errorMessage: '', // Will be set using translation in the UI.
      },
    };
  }

  public sendResponse(res: KibanaResponseFactory) {
    const body: GenerationErrorBody = {
      message: this.errorCode,
      attributes: this.attributes,
    };
    return res.customError({
      statusCode: 501,
      body,
    });
  }
}
