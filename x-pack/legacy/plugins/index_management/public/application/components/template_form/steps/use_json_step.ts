/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { isJSON } from '../../../../../../../../../src/plugins/es_ui_shared/static/validators/string';
import { StepProps } from '../types';

interface Parameters {
  prop: 'settings' | 'mappings' | 'aliases';
  setDataGetter: StepProps['setDataGetter'];
  onStepValidityChange: StepProps['onStepValidityChange'];
  defaultValue?: object;
}

const stringifyJson = (json: any) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

export const useJsonStep = ({
  prop,
  defaultValue = {},
  setDataGetter,
  onStepValidityChange,
}: Parameters) => {
  const [content, setContent] = useState<string>(stringifyJson(defaultValue));
  const [error, setError] = useState<string | null>(null);

  const validateContent = () => {
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

  const dataGetter = () => {
    const isValid = validateContent();
    const value = isValid && content.trim() !== '' ? JSON.parse(content) : {};
    const data = { [prop]: value };
    return Promise.resolve({ isValid, data });
  };

  useEffect(() => {
    const isValid = validateContent();
    onStepValidityChange(isValid);
    setDataGetter(dataGetter);
  }, [content]);

  return {
    content,
    setContent,
    error,
  };
};
