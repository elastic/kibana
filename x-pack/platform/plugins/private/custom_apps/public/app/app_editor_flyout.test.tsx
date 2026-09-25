/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { AppEditorFlyout } from './app_editor_flyout';
import type { CustomAppDefinition } from '../../common/app_definition';

// The editor is Monaco, which needs a DOM it cannot have in jsdom; the switch
// and Apply logic are what matter here.
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value }: { value: string }) => <textarea readOnly value={value} />,
}));

const definition: CustomAppDefinition = {
  version: 1,
  title: 'Web traffic',
  layout: { p1: { type: 'panel', id: 'p1', row: 0, column: 0, width: 24, height: 10 } },
  panels: { p1: {} },
  surfaces: {
    p1: [{ version: 'v1.0', createSurface: { surfaceId: 'p1', components: [] } }],
  },
} as CustomAppDefinition;

/**
 * Selected by role alone: Kibana's jest setup stubs `useGeneratedHtmlId` to a
 * constant, so EuiSwitch's button and its label collide on id and the
 * accessible name resolves empty here — an artifact of the environment, not of
 * the component.
 */
const navSwitch = () => screen.getByRole('switch');

function renderFlyout() {
  const onApply = jest.fn();
  render(
    <EuiProvider colorMode="light">
      <AppEditorFlyout definition={definition} onClose={jest.fn()} onApply={onApply} />
    </EuiProvider>
  );
  return { onApply };
}

describe('AppEditorFlyout', () => {
  it('starts with the navigation switch off for an app that has no flag', () => {
    renderFlyout();
    expect(navSwitch()).not.toBeChecked();
  });

  it('carries the switch through Apply, so saving persists it', () => {
    const { onApply } = renderFlyout();

    fireEvent.click(navSwitch());
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ showInNav: true }));
  });

  it('writes the flag into the document rather than holding it beside the JSON', () => {
    renderFlyout();
    fireEvent.click(navSwitch());
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain(
      '"showInNav": true'
    );
  });

  it('turns the flag back off again', () => {
    const { onApply } = renderFlyout();
    const toggle = navSwitch();

    fireEvent.click(toggle);
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ showInNav: false }));
  });
});
