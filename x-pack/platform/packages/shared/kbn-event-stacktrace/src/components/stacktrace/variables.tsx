/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KeyValueTable, flattenObject } from '@kbn/key-value-metadata-table';
import { Stackframe } from '@kbn/apm-types';
import { css } from '@emotion/react';

interface Props {
  vars: Stackframe['vars'];
}

export function Variables({ vars }: Props) {
  const { euiTheme } = useEuiTheme();

  if (!vars) {
    return null;
  }
  const flattenedVariables = flattenObject(vars);
  return (
    <React.Fragment>
      <div
        css={css`
          background: ${euiTheme.colors.emptyShade};
          border-radius: 0 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small};
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
        `}
      >
        <EuiAccordion
          id="local-variables"
          className="euiAccordion"
          buttonContent={i18n.translate(
            'xpack.eventStacktrace.stacktraceTab.localVariablesToogleButtonLabel',
            {
              defaultMessage: 'Local variables',
            }
          )}
        >
          <React.Fragment>
            <KeyValueTable keyValuePairs={flattenedVariables} />
          </React.Fragment>
        </EuiAccordion>
      </div>
    </React.Fragment>
  );
}
