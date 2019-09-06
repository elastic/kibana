/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ELEMENT_NUDGE_OFFSET, ELEMENT_SHIFT_OFFSET } from '../common/lib/constants';

export const ShortcutStrings = {
  getNamespaceDisplayNames: () => ({
    ELEMENT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Element controls',
    }),
    EXPRESSION: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Expression controls',
    }),
    EDITOR: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Editor controls',
    }),
    PRESENTATION: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Presentation controls',
    }),
  }),
  getShortcutHelp: () => ({
    CUT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Cut' }),
    COPY: i18n.translate('xpack.canvas.shortcuts.copyHelpText', { defaultMessage: 'Copy' }),
    PASTE: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Paste' }),
    CLONE: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Clone' }),
    DELETE: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Delete' }),
    BRING_FORWARD: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Bring to front',
    }),
    BRING_TO_FRONT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Bring forward',
    }),
    SEND_BACKWARD: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Send backward',
    }),
    SEND_TO_BACK: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Send to back',
    }),
    GROUP: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Group' }),
    UNGROUP: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Ungroup' }),
    SHIFT_UP: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift up by ${ELEMENT_SHIFT_OFFSET}px`,
    }),
    SHIFT_DOWN: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift down by ${ELEMENT_SHIFT_OFFSET}px`,
    }),
    SHIFT_LEFT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift left by ${ELEMENT_SHIFT_OFFSET}px`,
    }),
    SHIFT_RIGHT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift right by ${ELEMENT_SHIFT_OFFSET}px`,
    }),
    NUDGE_UP: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift up by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    NUDGE_DOWN: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift down by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    NUDGE_LEFT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift left by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    NUDGE_RIGHT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: `Shift right by ${ELEMENT_NUDGE_OFFSET}px`,
    }),
    RUN_EXPRESSION: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Run whole expression',
    }),
    MULTISELECT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Select multiple elements',
    }),
    RESIZE_FROM_CENTER: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Resize from center',
    }),
    IGNORE_SNAP: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Move, resize, and rotate without snapping',
    }),
    SELECT_BEHIND: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Select element below',
    }),
    UNDO: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Undo last action',
    }),
    REDO: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Redo last action',
    }),
    PREV: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Go to previous page',
    }),
    NEXT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Go to next page',
    }),
    EDITING: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Toggle edit mode',
    }),
    GRID: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Show grid' }),
    REFRESH: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Refresh workpad',
    }),
    ZOOM_IN: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Zoom in' }),
    ZOOM_OUT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', { defaultMessage: 'Zoom out' }),
    ZOOM_RESET: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Reset zoom to 100%',
    }),
    FULLSCREEN: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Enter presentation mode',
    }),
    FULLSCREEN_EXIT: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Exit presentation mode',
    }),
    PAGE_CYCLE_TOGGLE: i18n.translate('xpack.canvas.shortcuts.cutHelpText', {
      defaultMessage: 'Toggle page cycling',
    }),
  }),
};
