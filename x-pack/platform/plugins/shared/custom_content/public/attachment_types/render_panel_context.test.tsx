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

  it('falls back when the attachment carries no height', () => {
    expect(resolvePreviewHeight(undefined)).toBe(320);
  });

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

  it('renders against the captured filters, query and approximation', () => {
    render(
      <RenderPanelContext
        data={makeData({
          filters: [{ meta: { key: 'host.name' } }],
          query: { query: 'status:200', language: 'kuery' },
          is_approximate: true,
          project_routing: 'project-1',
        })}
      />
    );

    expect(mockComponentProps).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ meta: { key: 'host.name' } }],
        query: { query: 'status:200', language: 'kuery' },
        isApproximate: true,
        projectRouting: 'project-1',
      })
    );
  });

  it('renders nothing until the panel has a template', () => {
    const { container } = render(<RenderPanelContext data={makeData({ panel_template: '' })} />);

    expect(container).toBeEmptyDOMElement();
    expect(mockComponentProps).not.toHaveBeenCalled();
  });

  it('renders a static panel with no query', () => {
    render(<RenderPanelContext data={makeData({ esql_query: undefined })} />);

    expect(mockComponentProps).toHaveBeenCalledWith(
      expect.objectContaining({ esqlQuery: undefined })
    );
  });
});
