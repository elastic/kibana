/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiCode,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getPlatform } from '@kbn/shared-ux-utility';
import { keymap } from '../../lib/keymap';
import type { ShortcutMap, ShortcutNameSpace } from '../../../types/shortcuts';
import { getId } from '../../lib/get_id';
import { getPrettyShortcut } from '../../lib/get_pretty_shortcut';

const strings = {
  getFlyoutCloseButtonAriaLabel: () =>
    i18n.translate('xpack.canvas.keyboardShortcutsDoc.flyout.closeButtonAriaLabel', {
      defaultMessage: 'Closes keyboard shortcuts reference',
    }),
  getShortcutSeparator: () =>
    i18n.translate('xpack.canvas.keyboardShortcutsDoc.shortcutListSeparator', {
      defaultMessage: 'or',
      description:
        'Separates which keyboard shortcuts can be used for a single action. Example: "{shortcut1} or {shortcut2} or {shortcut3}"',
    }),
  getTitle: () =>
    i18n.translate('xpack.canvas.keyboardShortcutsDoc.flyoutHeaderTitle', {
      defaultMessage: 'Keyboard shortcuts',
    }),
};

interface DescriptionListItem {
  title: string;
  description: JSX.Element[];
}

interface Props {
  /**
   * click handler for closing flyout
   */
  onClose: () => void;
}

const platform = getPlatform();

const getDescriptionListItems = (shortcuts: ShortcutMap[]): DescriptionListItem[] =>
  shortcuts.map((shortcutKeyMap: ShortcutMap): DescriptionListItem => {
    const osShortcuts = shortcutKeyMap[platform];
    return {
      title: shortcutKeyMap.help,
      description: osShortcuts.reduce((acc: JSX.Element[], shortcut, i): JSX.Element[] => {
        // replace +'s with spaces so we can display the plus symbol for the plus key
        shortcut = shortcut.replace(/\+/g, ' ');
        if (i !== 0) {
          acc.push(<span key={getId('span')}> {strings.getShortcutSeparator()} </span>);
        }
        acc.push(
          <span key={getId('span')}>
            {getPrettyShortcut(shortcut)
              .split(/( )/g)
              .map((key) => (key === ' ' ? key : <EuiCode key={getId('shortcut')}>{key}</EuiCode>))}
          </span>
        );
        return acc;
      }, []),
    };
  });

export const KeyboardShortcutsDoc: FunctionComponent<Props> = ({ onClose }) => (
  <EuiFlyout
    closeButtonProps={{ 'aria-label': strings.getFlyoutCloseButtonAriaLabel() }}
    size="s"
    onClose={onClose}
  >
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2>{strings.getTitle()}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      {Object.values(keymap).map((namespace: ShortcutNameSpace) => {
        const { displayName, ...shortcuts } = namespace;
        return (
          <div key={getId('shortcuts')} className="canvasKeyboardShortcut">
            <EuiTitle size="xs">
              <h4>{displayName}</h4>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <EuiDescriptionList
              textStyle="reverse"
              type="column"
              listItems={getDescriptionListItems(Object.values(shortcuts) as ShortcutMap[])}
              compressed
            />
            <EuiSpacer />
          </div>
        );
      })}
    </EuiFlyoutBody>
  </EuiFlyout>
);

KeyboardShortcutsDoc.propTypes = {
  onClose: PropTypes.func.isRequired,
};
