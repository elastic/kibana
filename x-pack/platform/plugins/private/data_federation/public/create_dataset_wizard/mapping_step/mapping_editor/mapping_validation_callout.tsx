/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

export interface MappingValidationCalloutProps {
  globalErrors: readonly string[];
  hasFieldErrors: boolean;
}

export const MappingValidationCallout = ({
  globalErrors,
  hasFieldErrors,
}: MappingValidationCalloutProps) => {
  return (
    <KbnDangerCallout
      title={i18n.translate('xpack.dataFederation.mappingEditor.validation.title', {
        defaultMessage: 'Fix mapping errors',
      })}
      text={
        <ul>
          {globalErrors.map((e, idx) => (
            <li key={idx}>{e}</li>
          ))}
          {hasFieldErrors ? (
            <li>
              {i18n.translate('xpack.dataFederation.mappingEditor.validation.fieldErrors', {
                defaultMessage: 'One or more fields are incomplete or invalid.',
              })}
            </li>
          ) : null}
        </ul>
      }
      data-test-subj="dataFederationMappingEditorValidationError"
    />
  );
};
