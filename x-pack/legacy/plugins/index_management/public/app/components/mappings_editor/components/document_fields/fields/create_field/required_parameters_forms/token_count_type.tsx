/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { AnalyzerParameter } from '../../../field_parameters';
import { STANDARD } from '../../../../../constants';
import { EditFieldSection } from '../../edit_field';

export const TokenCountTypeRequiredParameters = () => {
  return (
    <EditFieldSection
      title={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.tokenCountRequired.analyzer.sectionTitle',
        {
          defaultMessage: 'Analyzer',
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
        useDefaultOptions={false}
      />
    </EditFieldSection>
  );
};
