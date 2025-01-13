/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleForm, RuleFormProps } from '@kbn/response-ops-rule-form';
import type { RuleTypeParams, RuleTypeMetaData } from '../types';

export const getAddRuleFlyoutLazy = <
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData extends RuleTypeMetaData = RuleTypeMetaData
>(
  props: RuleFormProps
) => {
  return <RuleForm {...props} isFlyout />;
};
