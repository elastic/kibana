/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { NameField } from '../fields/name_field';
import { TagsField } from '../fields/tags_field';
import { DescriptionField } from '../fields/description_field';
import { FieldGroup } from './field_group';

export const RuleDetailsFieldGroup = () => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.ruleDetailsSectionTitle', {
        defaultMessage: 'Rule details',
      })}
    >
      <NameField />
      <DescriptionField />
      <TagsField />
    </FieldGroup>
  );
};
