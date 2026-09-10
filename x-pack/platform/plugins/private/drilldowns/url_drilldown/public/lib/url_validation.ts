/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { url as urlUtils } from '@kbn/kibana-utils-plugin/public';
import type { UrlDrilldownScope } from './types';
import { compile } from './url_template';

const generalFormatError = i18n.translate('xpack.urlDrilldown.validation.invalidUrlMessage', {
  defaultMessage: 'Invalid URL format.',
});

const compileError = (message: string) =>
  i18n.translate('xpack.urlDrilldown.validation.urlCompileErrorMessage', {
    defaultMessage: 'The URL template is not valid in the given context. {message}.',
    values: {
      message: message.replaceAll('[object Object]', 'context'),
    },
  });

export async function validateUrlTemplate(
  url: string,
  scope: UrlDrilldownScope
): Promise<{ isValid: boolean; error?: string; invalidUrl?: string }> {
  if (!url)
    return {
      isValid: false,
      error: generalFormatError,
    };

  let compiledUrl: string;

  try {
    compiledUrl = await compile(url, scope);
  } catch (e) {
    return {
      isValid: false,
      error: compileError(e.message),
      invalidUrl: url,
    };
  }

  try {
    return urlUtils.validate(compiledUrl);
  } catch (e) {
    return {
      isValid: false,
      error: generalFormatError + ` ${e.message}.`,
      invalidUrl: compiledUrl,
    };
  }
}
