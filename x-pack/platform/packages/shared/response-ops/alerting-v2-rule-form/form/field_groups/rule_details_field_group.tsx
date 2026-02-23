/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldGroup } from './field_group';
import { NameField } from '../fields/name_field';
import { TagsField } from '../fields/tags_field';
import { DescriptionField } from '../fields/description_field';
import { EnabledField } from '../fields/enabled_field';
import { KindField } from '../fields/kind_field';

export const RuleDetailsFieldGroup: React.FC = () => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.ruleDetails', {
        defaultMessage: 'Rule details',
      })}
    >
      <NameField />
      <TagsField />
      <DescriptionField />
      <EnabledField />
      <KindField />
    </FieldGroup>
  );
};
