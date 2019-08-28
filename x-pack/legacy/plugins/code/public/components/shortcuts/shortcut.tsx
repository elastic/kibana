/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { registerShortcut, unregisterShortcut } from '../../actions';

export enum OS {
  win,
  mac,
  linux,
}

export enum Modifier {
  ctrl,
  meta,
  alt,
  shift,
}

export interface HotKey {
  key: string;
  modifier: Map<OS, Modifier[]>;
  help: string;
  onPress?: (dispatch: any) => void;
}

interface Props {
  keyCode: string;
  help: string;
  onPress?: (dispatch: any) => void;
  winModifier?: Modifier[];
  macModifier?: Modifier[];
  linuxModifier?: Modifier[];
  registerShortcut(hotKey: HotKey): void;
  unregisterShortcut(hotKey: HotKey): void;
}

class ShortcutsComponent extends React.Component<Props> {
  private readonly hotKey: HotKey;
  constructor(props: Props, context: any) {
    super(props, context);
    this.hotKey = {
      key: props.keyCode,
      help: props.help,
      onPress: props.onPress,
      modifier: new Map(),
    };
    if (props.winModifier) {
      this.hotKey.modifier.set(OS.win, props.winModifier);
    }
    if (props.macModifier) {
      this.hotKey.modifier.set(OS.mac, props.macModifier);
    }
    if (props.linuxModifier) {
      this.hotKey.modifier.set(OS.linux, props.linuxModifier);
    }
  }

  public componentDidMount(): void {
    this.props.registerShortcut(this.hotKey);
  }

  public componentWillUnmount(): void {
    this.props.unregisterShortcut(this.hotKey);
  }

  public render(): React.ReactNode {
    return null;
  }
}

const mapDispatchToProps = {
  registerShortcut,
  unregisterShortcut,
};

export const Shortcut = connect(
  null,
  mapDispatchToProps
)(ShortcutsComponent);
