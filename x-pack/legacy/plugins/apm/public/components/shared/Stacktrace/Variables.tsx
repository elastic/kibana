/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import styled from 'styled-components';
import { EuiHorizontalRule, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  borderRadius,
  fontFamily,
  px,
  unit,
  units
} from '../../../style/variables';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { DottedKeyValueTable } from '../DottedKeyValueTable';

const VariablesContainer = styled.div`
  background: ${theme.euiColorEmptyShade};
  border-top: 1px solid ${theme.euiColorLightShade};
  border-radius: 0 0 ${borderRadius} ${borderRadius};
  padding: ${px(units.half)} ${px(unit)};
  font-family: ${fontFamily};
`;

interface Props {
  vars: IStackframe['vars'];
}

export class Variables extends React.Component<Props> {
  public render() {
    if (!this.props.vars) {
      return null;
    }

    return (
      <React.Fragment>
        <EuiHorizontalRule margin="none" />
        <VariablesContainer>
          <EuiAccordion
            id="local-variables"
            buttonContent={i18n.translate(
              'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel',
              { defaultMessage: 'Local variables' }
            )}
          >
            <React.Fragment>
              <DottedKeyValueTable data={this.props.vars} maxDepth={5} />
            </React.Fragment>
          </EuiAccordion>
        </VariablesContainer>
      </React.Fragment>
    );
  }
}
