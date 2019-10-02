/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSpacer,
  EuiAccordion
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { DottedKeyValueTable } from '../DottedKeyValueTable';

interface Props {
  vars: IStackframe['vars'];
}

export class Variables extends React.Component<Props> {
  public localVariablesToogleButtonLabel() {
    return i18n.translate(
      'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel',
      { defaultMessage: 'Local variables' }
    );
  }

  public render() {
    if (!this.props.vars) {
      return null;
    }

    return (
      <React.Fragment>
        <EuiSpacer/>
        <EuiAccordion id="local-variables" buttonContent={ this.localVariablesToogleButtonLabel() }>       
          <React.Fragment>
            <DottedKeyValueTable data={this.props.vars} maxDepth={5} />
          </React.Fragment>
        </EuiAccordion>
      </React.Fragment>
    );
  }
}