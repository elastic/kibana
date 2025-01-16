/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFormProps } from '@kbn/response-ops-rule-form';
import React, { useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import type { RuleTypeMetaData } from '../types';

const RuleForm = <MetaData extends RuleTypeMetaData = RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const [Component, setComponent] = useState<React.ComponentType<RuleFormProps<MetaData>> | null>(
    null
  );
  useEffectOnce(() => {
    (async () => {
      const { RuleForm: RuleFormComponent } = await import('@kbn/response-ops-rule-form');
      setComponent(RuleFormComponent);
    })();
  });

  if (!Component) {
    return null;
  }
  return <Component {...props} />;
};

export const getRuleFormFlyoutLazy = <MetaData extends RuleTypeMetaData = RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  return <RuleForm {...props} isFlyout />;
};
