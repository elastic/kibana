/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

import { documentationService } from '../../../services/documentation';

export const MultipleMappingsWarning = () => (
  <EuiCallOut
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.multipleMappingsCallOutTitle', {
      defaultMessage: 'Multiple mappings detected',
    })}
    iconType="alert"
    color="warning"
  >
    <p>
      {i18n.translate('xpack.idxMgmt.mappingsEditor.multipleMappingsCallOutDescription1', {
        defaultMessage:
          'This template has multiple mappings declared for different document types. In order to edit the mappings you need to migrate to a single-type index mapping.',
      })}
    </p>

    <p>
      <a href={documentationService.getRemovalMappingTypeLink()} target="_blank">
        {i18n.translate('xpack.idxMgmt.mappingsEditor.multipleMappingsCallOutDescription2', {
          defaultMessage: 'Learn more about the removal of mapping types.',
        })}
      </a>
    </p>
  </EuiCallOut>
);
