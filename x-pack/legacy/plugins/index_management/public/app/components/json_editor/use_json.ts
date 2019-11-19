/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { isJSON } from '../../../../../../../../src/plugins/es_ui_shared/static/validators/string';

export type OnUpdateHandler<T = { [key: string]: any }> = (arg: {
  data: {
    raw: string;
    format(): T;
  };
  validate(): boolean;
  isValid: boolean;
}) => void;

interface Parameters<T extends object> {
  onUpdate: OnUpdateHandler<T>;
  defaultValue?: T;
}

const stringifyJson = (json: { [key: string]: any }) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

export const useJson = <T extends object = { [key: string]: any }>({
  defaultValue = {} as T,
  onUpdate,
}: Parameters<T>) => {
  const [content, setContent] = useState<string>(stringifyJson(defaultValue));
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    // We allow empty string as it will be converted to "{}""
    const isValid = content.trim() === '' ? true : isJSON(content);
    if (!isValid) {
      setError(
        i18n.translate('xpack.idxMgmt.validators.string.invalidJSONError', {
          defaultMessage: 'Invalid JSON format.',
        })
      );
    } else {
      setError(null);
    }
    return isValid;
  };

  const formatContent = () => {
    const isValid = validate();
    const data = isValid && content.trim() !== '' ? JSON.parse(content) : {};
    return data as T;
  };

  useEffect(() => {
    const isValid = validate();
    onUpdate({
      data: {
        raw: content,
        format: formatContent,
      },
      validate,
      isValid,
    });
  }, [content]);

  return {
    content,
    setContent,
    error,
  };
};
