/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import 'brace/mode/json';
import 'brace/theme/github';
import { EuiCodeEditor } from '@elastic/eui';
import { generateRulesFromRaw } from '../../../../../../../common/model/role_mappings/rule_builder';
import { BaseRule } from '../../../../../../../common/model/role_mappings/base_rule';

interface Props {
  rules: BaseRule | null;
  onChange: (updatedRules: BaseRule | null) => void;
  onValidityChange: (isValid: boolean) => void;
}

export const AdvancedRuleEditor = (props: Props) => {
  const [rawRules, setRawRules] = useState(
    JSON.stringify(props.rules ? props.rules.toRaw() : {}, null, 2)
  );

  function onRulesChange(updatedRules: string) {
    setRawRules(updatedRules);
    // Fire onChange only if rules are valid
    try {
      const ruleJSON = JSON.parse(updatedRules);
      props.onChange(generateRulesFromRaw(ruleJSON));
      props.onValidityChange(true);
    } catch (ignore) {
      props.onValidityChange(false);
    }
  }

  return (
    <EuiCodeEditor
      aria-label={''}
      mode={'json'}
      theme="github"
      value={rawRules}
      onChange={onRulesChange}
      width="100%"
      height="auto"
      minLines={6}
      maxLines={30}
      isReadOnly={false}
      setOptions={{
        showLineNumbers: true,
        tabSize: 2,
      }}
      editorProps={{
        $blockScrolling: Infinity,
      }}
      showGutter={true}
    />
  );
};
