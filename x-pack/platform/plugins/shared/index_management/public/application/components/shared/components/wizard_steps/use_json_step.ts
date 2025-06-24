/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { isJSON, Forms } from '../../../../../shared_imports';

interface Parameters {
  onChange: (content: Forms.Content) => void;
  defaultValue?: object;
  customValidate?: (json: string) => string | null;
}

const stringifyJson = (json: any) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

export const useJsonStep = ({ defaultValue, onChange, customValidate }: Parameters) => {
  const [jsonContent, setJsonContent] = useState<string>(stringifyJson(defaultValue ?? {}));
  const [error, setError] = useState<string | null>(null);

  const validateContent = useCallback(() => {
    // We allow empty string as it will be converted to "{}""
    const isValidJson = jsonContent.trim() === '' ? true : isJSON(jsonContent);
    const customValidationError = customValidate ? customValidate(jsonContent) : null;
    if (!isValidJson) {
      setError(
        i18n.translate('xpack.idxMgmt.validators.string.invalidJSONError', {
          defaultMessage: 'Invalid JSON format.',
        })
      );
    } else if (customValidationError) {
      setError(customValidationError);
    } else {
      setError(null);
    }
    return isValidJson && !customValidationError;
  }, [customValidate, jsonContent]);

  useEffect(() => {
    const isValid = validateContent();
    const getData = () => {
      const value = isValid && jsonContent.trim() !== '' ? JSON.parse(jsonContent) : {};
      // If no key has been added to the JSON object, we strip it out so an empty object is not sent in the request
      return Object.keys(value).length > 0 ? value : undefined;
    };

    const content = {
      isValid,
      validate: async () => isValid,
      getData,
    };

    onChange(content);
  }, [jsonContent, onChange, validateContent]);

  return {
    jsonContent,
    setJsonContent,
    error,
  };
};
