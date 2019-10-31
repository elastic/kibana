/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import styled from 'styled-components';
import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { borderRadius, px, unit, units } from '../../../style/variables';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { KeyValueTable } from '../KeyValueTable';
import { flattenObject } from '../../../utils/flattenObject';

const VariablesContainer = styled.div`
  background: ${theme.euiColorEmptyShade};
  border-radius: 0 0 ${borderRadius} ${borderRadius};
  padding: ${px(units.half)} ${px(unit)};
`;

interface Props {
  vars: IStackframe['vars'];
}

export const Variables = ({ vars }: Props) => {
  if (!vars) {
    return null;
  }
  const flattenedVariables = flattenObject(vars);
  return (
    <React.Fragment>
      <VariablesContainer>
        <EuiAccordion
          id="local-variables"
          className="euiAccordion"
          buttonContent={i18n.translate(
            'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel',
            { defaultMessage: 'Local variables' }
          )}
        >
          <React.Fragment>
            <KeyValueTable keyValuePairs={flattenedVariables} />
          </React.Fragment>
        </EuiAccordion>
      </VariablesContainer>
    </React.Fragment>
  );
};
