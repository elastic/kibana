/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KeyValueTable, getFlattenedKeyValuePairs } from '@kbn/key-value-metadata-table';
import { Stackframe } from '@kbn/apm-types';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

const VariablesContainer = euiStyled.div`
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-radius: 0 0 ${({ theme }) =>
    `${theme.eui.euiBorderRadiusSmall} ${theme.eui.euiBorderRadiusSmall}`};
  padding:  ${({ theme }) => `${theme.eui.euiSizeS} ${theme.eui.euiSizeM}`};
`;

interface Props {
  vars: Stackframe['vars'];
}

export function Variables({ vars }: Props) {
  if (!vars) {
    return null;
  }
  const flattenedVariables = getFlattenedKeyValuePairs(vars);
  return (
    <VariablesContainer>
      <EuiAccordion
        id="local-variables"
        data-test-subj="stacktraceLocalVariables"
        className="euiAccordion"
        buttonContent={i18n.translate(
          'xpack.eventStacktrace.stacktraceTab.localVariablesToogleButtonLabel',
          {
            defaultMessage: 'Local variables',
          }
        )}
      >
        <KeyValueTable keyValuePairs={flattenedVariables} />
      </EuiAccordion>
    </VariablesContainer>
  );
}
