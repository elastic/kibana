/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../services/documentation';
import { EditFieldFormRow } from '../fields/edit_field';
import { PARAMETERS_OPTIONS } from '../../../constants';
import { getFieldConfig } from '../../../lib';
import { UseField, Field } from '../../../shared_imports';

interface Props {
  defaultToggleValue: boolean;
}

export const SimilarityParameter = ({ defaultToggleValue }: Props) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.setSimilarityFieldTitle', {
      defaultMessage: 'Set similarity',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.setSimilarityFieldDescription', {
      defaultMessage: 'The scoring algorithm or similarity to use.',
    })}
    docLink={{
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.similarityDocLinkText', {
        defaultMessage: 'Similarity documentation',
      }),
      href: documentationService.getSimilarityLink(),
    }}
    defaultToggleValue={defaultToggleValue}
  >
    <UseField
      path="similarity"
      config={getFieldConfig('similarity')}
      component={Field}
      componentProps={{
        euiFieldProps: {
          options: PARAMETERS_OPTIONS.similarity,
        },
      }}
    />
  </EditFieldFormRow>
);
