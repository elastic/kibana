/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'brace';
import { installXJsonMode } from './x_json_mode';

export function initializeEditor({
  el,
  licenseEnabled,
  initialContent,
}: {
  el: HTMLDivElement;
  licenseEnabled: boolean;
  initialContent: string;
}) {
  const editor: ace.Editor = ace.acequire('ace/ace').edit(el);

  installXJsonMode(editor);
  editor.$blockScrolling = Infinity;

  if (!licenseEnabled) {
    editor.setReadOnly(true);
    editor.container.style.pointerEvents = 'none';
    editor.container.style.opacity = '0.5';
    editor.renderer.setStyle('disabled');
    editor.blur();
  }

  return editor;
}
