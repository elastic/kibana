/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { HoverState } from './hover_widget';

export interface HoverButtonProps {
  state: HoverState;
  gotoDefinition: () => void;
  findReferences: () => void;
}

export class HoverButtons extends React.PureComponent<HoverButtonProps> {
  public render() {
    return (
      <React.Fragment>
        <EuiFlexGroup className="button-group euiFlexGroup" gutterSize="none" responsive={true}>
          <EuiButton
            size="s"
            isDisabled={this.props.state !== HoverState.READY}
            onClick={this.props.gotoDefinition}
            data-test-subj="codeGoToDefinitionButton"
          >
            Goto Definition
          </EuiButton>
          <EuiButton
            size="s"
            isDisabled={this.props.state !== HoverState.READY}
            onClick={this.props.findReferences}
            data-test-subj="codeFindReferenceButton"
          >
            Find Reference
          </EuiButton>
        </EuiFlexGroup>
      </React.Fragment>
    );
  }
}
