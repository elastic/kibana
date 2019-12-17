/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

type NormsParameterNames = 'norms' | 'norms_keyword';

export const NormsParameter = ({ configPath = 'norms' }: { configPath?: NormsParameterNames }) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldTitle', {
      defaultMessage: 'Use norms',
    })}
    description={i18n.translate('xpack.idxMgmt.mappingsEditor.useNormsFieldDescription', {
      defaultMessage:
        'Account for field length when scoring queries. Norms are useful for scoring, but also require a lot of disk space.',
    })}
    formFieldPath="norms"
    configPath={configPath}
  />
);
