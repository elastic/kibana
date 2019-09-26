/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import { EuiButton, EuiHorizontalRule, EuiText, EuiSpacer, EuiPortal } from '@elastic/eui';
import { documentationLinks } from '../../lib/documentation_links';
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
        <EuiHorizontalRule margin="none" />
        <EuiSpacer />
        <EuiText size="s">
          <p>{strings.getHelpMenuDescription()}</p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill iconType="popout" href={documentationLinks.canvas} target="_blank">
          {strings.getDocumentationLinkLabel()}
        </EuiButton>
        <EuiSpacer />
        <EuiButton onClick={this.showFlyout} target="_blank">
          {strings.getKeyboardShortcutsLinkLabel()}
        </EuiButton>

        {this.state.isFlyoutVisible && (
          <EuiPortal>
            <KeyboardShortcutsDoc onClose={this.hideFlyout} />
          </EuiPortal>
        )}
      </Fragment>
    );
  }
}
