/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ValidationFunc } from '../shared_imports';
import { NormalizedFields } from '../types';

export const validateUniqueName = (
  { rootLevelFields, byId }: Pick<NormalizedFields, 'rootLevelFields' | 'byId'>,
  initialName: string | undefined = '',
  parentId?: string
) => {
  const validator: ValidationFunc = ({ value }) => {
    const existingNames = parentId
      ? Object.values(byId)
          .filter(field => field.parentId === parentId)
          .map(field => field.source.name)
      : rootLevelFields.map(fieldId => byId[fieldId].source.name);

    if (existingNames.filter(name => name !== initialName).includes(value as string)) {
      return {
        message: i18n.translate('xpack.idxMgmt.mappingsEditor.existNamesValidationErrorMessage', {
          defaultMessage: 'There is already a field with this name.',
        }),
      };
    }
  };

  return validator;
};
