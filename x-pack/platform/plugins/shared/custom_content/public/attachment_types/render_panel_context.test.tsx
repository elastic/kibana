/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ESQLVariableType } from '@kbn/esql-types';
import type { CustomContentContextAttachmentData } from '../../common/panel_context_attachment';
import { RenderPanelContext, resolvePreviewHeight } from './render_panel_context';

const mockComponentProps = jest.fn();
jest.mock('@kbn/custom-content-renderer', () => ({
  CustomContentComponent: (props: Record<string, unknown>) => {
    mockComponentProps(props);
    return <span data-test-subj="custom-content" />;
  },
}));

jest.mock('../services', () => ({
  getServices: () => ({ core: { http: {}, uiSettings: {} }, search: jest.fn() }),
}));

const makeData = (
  data: Partial<CustomContentContextAttachmentData> = {}
): CustomContentContextAttachmentData => ({
  panel_template: '<div>panel</div>',
  esql_query: 'FROM logs',
  panel_title: 'My panel',
  embeddable_id: 'panel-1',
  ...data,
});

describe('resolvePreviewHeight', () => {
  it('uses the height captured from the panel', () => {
    expect(resolvePreviewHeight(480)).toBe(480);
  });

  // Attachments pushed before the height was captured, and panels that never rendered.
  it('falls back when the attachment carries no height', () => {
    expect(resolvePreviewHeight(undefined)).toBe(320);
  });

  // The renderer's own iframe container has a 200px floor, so a shorter wrapper would be
  // overflowed by its own content rather than shrinking with it.
  it('clamps below the renderer floor', () => {
    expect(resolvePreviewHeight(40)).toBe(200);
  });

  it('clamps a very tall panel to something a chat card can hold', () => {
    expect(resolvePreviewHeight(5000)).toBe(1200);
  });
});

describe('RenderPanelContext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the snapshot the attachment carries', () => {
    render(<RenderPanelContext data={makeData()} />);

    expect(screen.getByTestId('custom-content')).toBeTruthy();
    expect(mockComponentProps).toHaveBeenCalledWith(
      expect.objectContaining({
        savedTemplate: '<div>panel</div>',
        esqlQuery: 'FROM logs',
        embeddableId: 'panel-1',
      })
    );
  });

  // The range is part of the snapshot: without it the preview renders against a default
  // window and shows different numbers than the dashboard the user came from.
  it('renders against the captured time range', () => {
    render(<RenderPanelContext data={makeData({ time_range: { from: 'now-7d', to: 'now' } })} />);

    expect(mockComponentProps).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: { from: 'now-7d', to: 'now' } })
    );
  });

  it('renders against the captured ES|QL control variables', () => {
    render(
      <RenderPanelContext
        data={makeData({
          esql_variables: [{ key: 'host', value: 'host-1', type: ESQLVariableType.VALUES }],
        })}
      />
    );

    expect(mockComponentProps).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlVariables: [{ key: 'host', value: 'host-1', type: ESQLVariableType.VALUES }],
      })
    );
  });

  it('renders a static panel with no query', () => {
    render(<RenderPanelContext data={makeData({ esql_query: undefined })} />);

    expect(mockComponentProps).toHaveBeenCalledWith(
      expect.objectContaining({ esqlQuery: undefined })
    );
  });
});
