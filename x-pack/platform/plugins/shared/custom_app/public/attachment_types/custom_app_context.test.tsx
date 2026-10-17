/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { customAppContextAttachmentUiDefinition } from './custom_app_context';

jest.mock('./app_card', () => ({
  AppCard: ({ canSave, title }: { canSave: boolean; title?: string }) => (
    <div data-test-subj="appCard">{`${title ?? 'untitled'} ${
      canSave ? 'can save' : 'cannot save'
    }`}</div>
  ),
}));

const document = appDocumentSchema.parse({ root: { type: 'heading', id: 'title', text: 'Hi' } });

const attachment = (data: { panel_title?: string; embeddable_id?: string } = {}) =>
  ({ id: 'att-1', type: 'platform.custom_app.app_context', data: { ...data, document } } as never);

describe('the custom app attachment in chat', () => {
  const definition = customAppContextAttachmentUiDefinition;

  it('is labelled with the title of the app, or Custom app when it has none', () => {
    expect(definition.getLabel(attachment({ panel_title: 'Service health' }))).toBe(
      'Service health'
    );
    expect(definition.getLabel(attachment())).toBe('Custom app');
  });

  it('has an icon', () => {
    expect(definition.getIcon?.()).toBe('apps');
  });

  it('shows the app itself, which can be saved when it was made in the conversation', async () => {
    render(
      <>
        {definition.renderInlineContent?.({
          attachment: attachment({ panel_title: 'A' }),
        } as never)}
      </>
    );

    expect(await screen.findByText('A can save')).toBeInTheDocument();
  });

  it('cannot be saved when it came from a panel, which is on a dashboard already', async () => {
    render(
      <>
        {definition.renderInlineContent?.({
          attachment: attachment({ embeddable_id: 'p' }),
        } as never)}
      </>
    );

    expect(await screen.findByText('untitled cannot save')).toBeInTheDocument();
  });

  it("offers no way to apply a version to a panel: the panel takes the agent's answer itself", () => {
    expect(definition.getActionButtons).toBeUndefined();
  });
});
