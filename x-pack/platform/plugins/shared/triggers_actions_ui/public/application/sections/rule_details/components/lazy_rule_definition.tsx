/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleDefinitionProps } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { EuiLoadingSpinnerSize } from '@elastic/eui/src/components/loading/loading_spinner';

interface Props extends RuleDefinitionProps {
  size?: EuiLoadingSpinnerSize
};

export function LazyRuleDefinition(props: Props) {
  const { ruleTypeRegistry, size, ...rest } = props;
  
  const { value, loading, error } = useAsync(async () => {
    const [{ RuleDefinition }, ruleTypeModel] = await Promise.all([
      import('./rule_definition'),
      ruleTypeRegistry.get(props.rule.ruleTypeId)
    ]);
    return { RuleDefinition, ruleTypeModel };
  }, [props.rule, ruleTypeRegistry]);

  if (loading) {
    return <CenterJustifiedSpinner size={size ?? 'm'} />;
  }

  if (!value) {
    return <div>{error?.message}</div>;
  }

  return <value.RuleDefinition
    {...rest}
    ruleTypeModel={value.ruleTypeModel}
  />;
}