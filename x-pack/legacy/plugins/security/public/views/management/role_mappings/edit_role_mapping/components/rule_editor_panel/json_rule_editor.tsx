/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';

import 'brace/mode/json';
import 'brace/theme/github';
import { EuiCodeEditor, EuiFormRow, EuiButton, EuiSpacer, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Rule, RuleBuilderError, generateRulesFromRaw } from '../../../model';
import { documentationLinks } from '../../../services/documentation_links';

interface Props {
  rules: Rule | null;
  onChange: (updatedRules: Rule | null) => void;
  onValidityChange: (isValid: boolean) => void;
}

export const JSONRuleEditor = (props: Props) => {
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
        i18n.translate('xpack.security.management.editRoleMapping.JSONEditorRuleError', {
          defaultMessage: 'Invalid rule definition at {ruleLocation}: {errorMessage}',
          values: {
            ruleLocation: ruleBuilderError.ruleTrace.join('.'),
            errorMessage: ruleBuilderError.message,
          },
        })
      }
      fullWidth
      data-test-subj="roleMappingsJSONEditor"
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
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.autoFormatRuleText"
            defaultMessage="Reformat"
          />
        </EuiButton>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.JSONEditorHelpText"
              defaultMessage="Specify your rules in JSON format consistent with the {roleMappingAPI}"
              values={{
                roleMappingAPI: (
                  <EuiLink
                    href={documentationLinks.getRoleMappingAPIDocUrl()}
                    external={true}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.security.management.editRoleMapping.JSONEditorEsApi"
                      defaultMessage="Elasticsearch role mapping API."
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </Fragment>
    </EuiFormRow>
  );
};
