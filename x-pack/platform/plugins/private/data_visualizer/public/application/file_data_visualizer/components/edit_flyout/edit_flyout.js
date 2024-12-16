/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';

import { Overrides } from './overrides';

export class EditFlyout extends Component {
  constructor(props) {
    super(props);

    this.applyOverrides = () => {};
    this.state = {
      overridesValid: true,
    };
  }

  applyAndClose = () => {
    this.applyOverrides();
    this.props.closeEditFlyout();
  };

  setApplyOverrides = (applyOverrides) => {
    this.applyOverrides = applyOverrides;
  };
  unsetApplyOverrides = () => {
    this.applyOverrides = () => {};
  };
  setOverridesValid = (overridesValid) => {
    this.setState({ overridesValid });
  };

  render() {
    const { isFlyoutVisible, closeEditFlyout, setOverrides, overrides, originalSettings, fields } =
      this.props;

    return (
      <React.Fragment>
        {isFlyoutVisible && (
          <EuiFlyout
            // ownFocus
            onClose={closeEditFlyout}
            size="m"
          >
            <EuiFlyoutHeader>
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.editFlyout.overrideSettingsTitle"
                    defaultMessage="Override settings"
                  />
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <Overrides
                setOverrides={setOverrides}
                overrides={overrides}
                originalSettings={originalSettings}
                setApplyOverrides={this.setApplyOverrides}
                setOverridesValid={this.setOverridesValid}
                fields={fields}
              />

              {/* <EuiTabbedContent
                tabs={tabs}
                initialSelectedTab={tabs[0]}
                onTabClick={() => { }}
              /> */}
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="cross" onClick={closeEditFlyout} flush="left">
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.editFlyout.closeOverrideSettingsButtonLabel"
                      defaultMessage="Close"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={this.applyAndClose}
                    isDisabled={this.state.overridesValid === false}
                    fill
                  >
                    <FormattedMessage
                      id="xpack.dataVisualizer.file.editFlyout.applyOverrideSettingsButtonLabel"
                      defaultMessage="Apply"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        )}
      </React.Fragment>
    );
  }
}
