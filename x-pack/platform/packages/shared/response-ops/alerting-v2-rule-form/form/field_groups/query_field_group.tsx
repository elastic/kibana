/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldGroup } from './field_group';
import { EvaluationQueryField } from '../fields/evaluation_query_field';

export const QueryFieldGroup: React.FC = () => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.querySection', {
        defaultMessage: 'Query',
      })}
    >
      <EvaluationQueryField />
    </FieldGroup>
  );
};
