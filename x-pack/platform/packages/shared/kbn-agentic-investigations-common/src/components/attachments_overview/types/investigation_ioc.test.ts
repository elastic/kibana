/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getInvestigationIocDetailRows } from './investigation_ioc';

const TYPE = 'security.investigation.iocs';

const makeAttachment = (overrides: Partial<VersionedAttachment> = {}): VersionedAttachment => ({
  id: 'investigation_ioc-1',
  type: TYPE,
  current_version: 2,
  description: 'a description',
  origin: 'origin-1',
  versions: [
    { version: 1, data: { v: 1 }, created_at: '2026-09-01T10:00:00.000Z', content_hash: 'h1' },
    { version: 2, data: { v: 2 }, created_at: '2026-09-01T11:00:00.000Z', content_hash: 'h2' },
  ],
  ...overrides,
});

type GetUiDefinition = AttachmentServiceStartContract['getAttachmentUiDefinition'];

const withRenderer = (render: jest.Mock): jest.MockedFunction<GetUiDefinition> =>
  jest.fn(() => ({
    getLabel: () => 'Attachment',
    renderConversationDetailsContent: render,
  })) as unknown as jest.MockedFunction<GetUiDefinition>;

describe('getInvestigationIocDetailRows', () => {
  it('renders the latest version through the details renderer', () => {
    const render = jest.fn(() => 'content');
    const getUiDefinition = withRenderer(render);

    expect(getInvestigationIocDetailRows([makeAttachment()], getUiDefinition)).toEqual({
      key: 'investigation_ioc-1',
      content: 'content',
    });
    expect(getUiDefinition).toHaveBeenCalledWith(TYPE);
    expect(render).toHaveBeenCalledWith({
      attachment: {
        id: 'investigation_ioc-1',
        type: TYPE,
        data: { v: 2 },
        description: 'a description',
        origin: 'origin-1',
      },
    });
  });

  it('uses the first matching visible attachment', () => {
    const render = jest.fn(() => 'content');

    const result = getInvestigationIocDetailRows(
      [
        makeAttachment({ id: 'hidden', hidden: true }),
        makeAttachment({ id: 'first' }),
        makeAttachment({ id: 'second' }),
      ],
      withRenderer(render)
    );

    expect(result?.key).toBe('first');
  });

  it('returns undefined when there is no attachment of this type', () => {
    const getUiDefinition = withRenderer(jest.fn(() => 'content'));

    expect(
      getInvestigationIocDetailRows([makeAttachment({ type: 'security.alerts' })], getUiDefinition)
    ).toBeUndefined();
    expect(getInvestigationIocDetailRows([], getUiDefinition)).toBeUndefined();
    expect(getUiDefinition).not.toHaveBeenCalled();
  });

  it('returns undefined for a hidden attachment without looking up its definition', () => {
    const getUiDefinition = withRenderer(jest.fn(() => 'content'));

    expect(
      getInvestigationIocDetailRows([makeAttachment({ hidden: true })], getUiDefinition)
    ).toBeUndefined();
    expect(getUiDefinition).not.toHaveBeenCalled();
  });

  it('returns undefined when the type has no UI definition', () => {
    const getUiDefinition = jest.fn(() => undefined) as unknown as GetUiDefinition;

    expect(getInvestigationIocDetailRows([makeAttachment()], getUiDefinition)).toBeUndefined();
  });

  it('returns undefined when the definition has no details renderer', () => {
    const getUiDefinition = jest.fn(() => ({
      getLabel: () => 'Attachment',
    })) as unknown as GetUiDefinition;

    expect(getInvestigationIocDetailRows([makeAttachment()], getUiDefinition)).toBeUndefined();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['false', false],
  ])('returns undefined when the renderer returns %s', (_label, rendered) => {
    expect(
      getInvestigationIocDetailRows([makeAttachment()], withRenderer(jest.fn(() => rendered)))
    ).toBeUndefined();
  });

  it.each([
    ['an empty string', ''],
    ['zero', 0],
  ])('keeps content that is %s', (_label, rendered) => {
    expect(
      getInvestigationIocDetailRows([makeAttachment()], withRenderer(jest.fn(() => rendered)))
    ).toEqual({ key: 'investigation_ioc-1', content: rendered });
  });
});
