/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  OBSERVABLE_ATTACHMENT_TYPE,
  type ObservableAttachmentData,
} from '../../../common/types/agent_builder/attachment_schemas';
import {
  createObservableAttachmentType,
  formatObservableDescription,
} from './observable_attachment_type';

const buildObservableData = (
  overrides: Partial<ObservableAttachmentData> = {}
): ObservableAttachmentData => ({
  id: 'observable-1',
  type_key: 'observable-type-ipv4',
  type_label: 'IPv4',
  value: '10.0.0.8',
  description: 'seen on the edge',
  metadata: { triage: 'confirmed' },
  case_id: 'case-1',
  case_title: 'Phishing campaign',
  owner: 'securitySolution',
  ...overrides,
});

const formatContext: AttachmentFormatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

describe('observable attachment type', () => {
  it('validates a valid observable payload', async () => {
    const result = await createObservableAttachmentType().validate(buildObservableData());
    expect(result.valid).toBe(true);
  });

  it('rejects a payload without a case', async () => {
    const result = await createObservableAttachmentType().validate({
      id: 'observable-1',
      type_key: 'observable-type-ipv4',
      value: '10.0.0.8',
    });
    expect(result.valid).toBe(false);
  });

  it('rejects more metadata pairs than a value holds', async () => {
    const metadata = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [`key-${index}`, 'value'])
    );
    const result = await createObservableAttachmentType().validate(
      buildObservableData({ metadata })
    );
    expect(result.valid).toBe(false);
  });

  it('describes the observable, its case and its shared metadata to the agent', async () => {
    const definition = createObservableAttachmentType();
    const formatted = await definition.format(
      { id: 'observable-1', type: OBSERVABLE_ATTACHMENT_TYPE, data: buildObservableData() },
      formatContext
    );
    const representation = await formatted.getRepresentation!();

    expect(representation).toEqual({
      type: 'text',
      value: formatObservableDescription(buildObservableData()),
    });
    expect(formatObservableDescription(buildObservableData())).toBe(
      'Observable IPv4 "10.0.0.8" (type key observable-type-ipv4) in case "Phishing campaign" (id case-1, owner=securitySolution). Description in this case: seen on the edge. Metadata shared by every case in the space holding this value: triage=confirmed.'
    );
  });

  it('leaves out an empty description and metadata', () => {
    expect(
      formatObservableDescription(buildObservableData({ description: null, metadata: {} }))
    ).toBe(
      'Observable IPv4 "10.0.0.8" (type key observable-type-ipv4) in case "Phishing campaign" (id case-1, owner=securitySolution).'
    );
  });
});
