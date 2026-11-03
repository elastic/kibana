/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INPUT_TYPE_ROLES: Record<string, string> = {
  text: 'textbox',
  email: 'textbox',
  tel: 'textbox',
  url: 'textbox',
  password: 'textbox',
  search: 'searchbox',
  checkbox: 'checkbox',
  radio: 'radio',
  submit: 'button',
  button: 'button',
  reset: 'button',
  image: 'button',
  number: 'spinbutton',
  range: 'slider',
};

const TAG_ROLES: Record<string, string> = {
  button: 'button',
  select: 'combobox',
  textarea: 'textbox',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  table: 'table',
  tr: 'row',
  td: 'cell',
  th: 'columnheader',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  nav: 'navigation',
  main: 'main',
  dialog: 'dialog',
  img: 'img',
  form: 'form',
  option: 'option',
};

/** The role an element has without an explicit `role` attribute, for the subset of HTML we map. */
export const implicitRole = (el: Element): string | undefined => {
  const tag = el.tagName.toLowerCase();
  if (tag === 'a') {
    return el.hasAttribute('href') ? 'link' : undefined;
  }
  if (tag === 'input') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    return INPUT_TYPE_ROLES[type] ?? (type === 'hidden' ? undefined : 'textbox');
  }
  return TAG_ROLES[tag];
};

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'option',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'switch',
  'slider',
  'spinbutton',
  'treeitem',
]);

/** Whether elements with this role get a ref the model can act on. */
export const isInteractiveRole = (role: string): boolean => INTERACTIVE_ROLES.has(role);

const NAME_FROM_CONTENT_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'option',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'switch',
  'treeitem',
  'heading',
  'cell',
  'columnheader',
  'rowheader',
  'listitem',
  'row',
]);

/** Whether elements with this role take their name from their text content when nothing else names them. */
export const isNameFromContentRole = (role: string): boolean => NAME_FROM_CONTENT_ROLES.has(role);
