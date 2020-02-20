/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { AnalyzerParameter } from '../../../field_parameters';
import { STANDARD } from '../../../../../constants';
import { FormRow } from '../../../../../shared_imports';

export const TokenCountTypeRequiredParameters = () => {
  return (
    <FormRow
      title={
        <h3>
          {i18n.translate('xpack.idxMgmt.mappingsEditor.tokenCount.analyzerFieldTitle', {
            defaultMessage: 'Analyzer',
          })}
        </h3>
      }
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.tokenCount.analyzerFieldDescription',
        {
          defaultMessage:
            'The analyzer which should be used to analyze the string value. For best performance, use an analyzer without token filters.',
        }
      )}
    >
      <AnalyzerParameter
        path="analyzer"
        label={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.tokenCountRequired.analyzerFieldLabel',
          {
            defaultMessage: 'Index analyzer',
          }
        )}
        defaultValue={STANDARD}
        allowsIndexDefaultOption={false}
      />
    </FormRow>
  );
};
