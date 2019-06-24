/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { toggleHelp } from '../../actions';
import { RootState } from '../../reducers';
import { HotKey, Modifier, OS } from './shortcut';

interface Props {
  showHelp: boolean;
  shortcuts: HotKey[];
  dispatch(action: any): void;
}

class ShortcutsComponent extends React.Component<Props> {
  private readonly os: OS;

  constructor(props: Props) {
    super(props);

    if (navigator.appVersion.indexOf('Win') !== -1) {
      this.os = OS.win;
    } else if (navigator.appVersion.indexOf('Mac') !== -1) {
      this.os = OS.mac;
    } else {
      this.os = OS.linux;
    }
  }

  public componentDidMount(): void {
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('keypress', this.handleKeyPress);
  }

  public componentWillUnmount(): void {
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('keypress', this.handleKeyPress);
  }

  public render(): React.ReactNode {
    return (
      <React.Fragment>
        {this.props.showHelp && (
          <EuiOverlayMask>
            <EuiModal onClose={this.closeModal}>
              <EuiModalHeader>
                <EuiModalHeaderTitle>Keyboard Shortcuts</EuiModalHeaderTitle>
              </EuiModalHeader>

              <EuiModalBody>{this.renderShortcuts()}</EuiModalBody>
              <EuiModalFooter>
                <EuiButton onClick={this.closeModal} fill>
                  Close
                </EuiButton>
              </EuiModalFooter>
            </EuiModal>
          </EuiOverlayMask>
        )}
      </React.Fragment>
    );
  }

  private handleKeydown = (event: KeyboardEvent) => {
    const target = event.target;
    const key = event.key;
    // @ts-ignore
    if (target && target.tagName === 'INPUT') {
      if (key === 'Escape') {
        // @ts-ignore
        target.blur();
      }
    }
  };

  private handleKeyPress = (event: KeyboardEvent) => {
    const target = event.target;
    const key = event.key;
    // @ts-ignore
    if (target && target.tagName === 'INPUT') {
      return;
    }

    const isPressed = (s: HotKey) => {
      if (s.modifier) {
        const mods = s.modifier.get(this.os) || [];
        for (const mod of mods) {
          switch (mod) {
            case Modifier.alt:
              if (!event.altKey) {
                return false;
              }
              break;
            case Modifier.ctrl:
              if (!event.ctrlKey) {
                return false;
              }
              break;
            case Modifier.meta:
              if (!event.metaKey) {
                return false;
              }
              break;
            case Modifier.shift:
              if (!event.shiftKey) {
                return false;
              }
              break;
          }
        }
      }
      return key === s.key;
    };

    let isTriggered = false;
    for (const shortcut of this.props.shortcuts) {
      if (isPressed(shortcut) && shortcut.onPress) {
        shortcut.onPress(this.props.dispatch);
        isTriggered = true;
      }
    }
    if (isTriggered) {
      // Discard this input since it's been triggered already.
      event.preventDefault();
    }
  };

  private closeModal = () => {
    this.props.dispatch(toggleHelp(false));
  };

  private showModifier(mod: Modifier): string {
    switch (mod) {
      case Modifier.meta:
        if (this.os === OS.mac) {
          return '⌘';
        } else if (this.os === OS.win) {
          return '⊞ Win';
        } else {
          return 'meta';
        }

      case Modifier.shift:
        if (this.os === OS.mac) {
          return '⇧';
        } else {
          return 'shift';
        }
      case Modifier.ctrl:
        if (this.os === OS.mac) {
          return '⌃';
        } else {
          return 'ctrl';
        }
      case Modifier.alt:
        if (this.os === OS.mac) {
          return '⌥';
        } else {
          return 'alt';
        }
    }
  }

  private renderShortcuts() {
    return this.props.shortcuts.map((s, idx) => {
      return (
        <div key={'shortcuts_' + idx}>
          {this.renderModifier(s)}
          <span className="codeShortcuts__key">{s.key}</span>
          <span className="codeShortcuts__helpText">{s.help}</span>
        </div>
      );
    });
  }

  private renderModifier(hotKey: HotKey) {
    if (hotKey.modifier) {
      const modifiers = hotKey.modifier.get(this.os) || [];
      return modifiers.map(m => <div className="codeShortcuts__key">{this.showModifier(m)}</div>);
    } else {
      return null;
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  shortcuts: state.shortcuts.shortcuts,
  showHelp: state.shortcuts.showHelp,
});

export const ShortcutsProvider = connect(mapStateToProps)(ShortcutsComponent);
