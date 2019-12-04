/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';

import 'brace/mode/json';
import 'brace/theme/github';
import { EuiCodeEditor, EuiFormRow, EuiButton, EuiSpacer } from '@elastic/eui';
import { BaseRule, RuleBuilderError, generateRulesFromRaw } from '../../../model';

interface Props {
  rules: BaseRule | null;
  onChange: (updatedRules: BaseRule | null) => void;
  onValidityChange: (isValid: boolean) => void;
}

export const AdvancedRuleEditor = (props: Props) => {
  const [rawRules, setRawRules] = useState(
    JSON.stringify(props.rules ? props.rules.toRaw() : {}, null, 2)
  );

  const [ruleBuilderError, setRuleBuilderError] = useState<RuleBuilderError | null>(null);

  function onRulesChange(updatedRules: string) {
    setRawRules(updatedRules);
    // Fire onChange only if rules are valid
    try {
      const ruleJSON = JSON.parse(updatedRules);
      props.onChange(generateRulesFromRaw(ruleJSON).rules);
      props.onValidityChange(true);
      setRuleBuilderError(null);
    } catch (e) {
      if (e instanceof RuleBuilderError) {
        setRuleBuilderError(e);
      } else {
        setRuleBuilderError(null);
      }
      props.onValidityChange(false);
    }
  }

  function reformatRules() {
    try {
      const ruleJSON = JSON.parse(rawRules);
      setRawRules(JSON.stringify(ruleJSON, null, 2));
    } catch (ignore) {
      // ignore
    }
  }

  return (
    <EuiFormRow
      isInvalid={Boolean(ruleBuilderError)}
      error={
        ruleBuilderError &&
        `Invalid rule definition at ${ruleBuilderError.ruleTrace.join('.')} : ${
          ruleBuilderError.message
        }`
      }
      fullWidth
    >
      <Fragment>
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
        <EuiSpacer size="s" />
        <EuiButton iconType="broom" onClick={reformatRules} size="s">
          Auto-format
        </EuiButton>
      </Fragment>
    </EuiFormRow>
  );
};
