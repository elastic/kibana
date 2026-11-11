/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AUTHORING_GUIDE_EXAMPLE } from './authoring_guide';
import { readAppContextData } from './read_app_context_data';

const attachment = (versions: Array<{ version: number; data: unknown }>): VersionedAttachment =>
  ({
    id: 'att-1',
    type: 'platform.custom_app.app_context',
    current_version: versions[versions.length - 1]?.version ?? 0,
    versions,
  } as unknown as VersionedAttachment);

const data = (title: string) => ({
  embeddable_id: 'panel-1',
  panel_title: title,
  document: AUTHORING_GUIDE_EXAMPLE,
});

describe('readAppContextData', () => {
  it('reads the data of the latest version', () => {
    const read = readAppContextData(
      attachment([
        { version: 1, data: data('old') },
        { version: 2, data: data('new') },
      ])
    );

    expect(read?.embeddable_id).toBe('panel-1');
    expect(read?.panel_title).toBe('new');
  });

  it('gives nothing for data that is not an app context', () => {
    expect(
      readAppContextData(attachment([{ version: 1, data: { embeddable_id: 'x' } }]))
    ).toBeUndefined();
    expect(readAppContextData(attachment([{ version: 1, data: 'text' }]))).toBeUndefined();
    expect(readAppContextData(attachment([{ version: 1, data: null }]))).toBeUndefined();
  });

  it('gives nothing for an attachment with no versions', () => {
    expect(readAppContextData(attachment([]) as VersionedAttachment)).toBeUndefined();
  });
});
