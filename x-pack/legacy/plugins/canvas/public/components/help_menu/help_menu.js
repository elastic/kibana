/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import { EuiButtonEmpty, EuiPortal } from '@elastic/eui';
import { KeyboardShortcutsDoc } from '../keyboard_shortcuts_doc';
import { ComponentStrings } from '../../../i18n';

const { HelpMenu: strings } = ComponentStrings;

export class HelpMenu extends PureComponent {
  state = { isFlyoutVisible: false };

  showFlyout = () => {
    this.setState({ isFlyoutVisible: true });
  };

  hideFlyout = () => {
    this.setState({ isFlyoutVisible: false });
  };

  render() {
    return (
      <Fragment>
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="keyboardShortcut"
          onClick={this.showFlyout}
        >
          {strings.getKeyboardShortcutsLinkLabel()}
        </EuiButtonEmpty>

        {this.state.isFlyoutVisible && (
          <EuiPortal>
            <KeyboardShortcutsDoc onClose={this.hideFlyout} />
          </EuiPortal>
        )}
      </Fragment>
    );
  }
}
