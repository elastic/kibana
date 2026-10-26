/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { createControlFieldCapabilitiesResolver } from './control_field_capabilities_resolver';

type FieldCapsMapping = string | { readonly type: string; readonly aggregatable: boolean };

const index = 'kibana_sample_data_logs';

/** Mock `_field_caps`. A plain `text` mapping is not aggregatable; list several mappings for a conflict. */
const createFieldCapsEsClient = (
  fields: Readonly<Record<string, FieldCapsMapping | readonly FieldCapsMapping[]>>
) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.fieldCaps.mockResolvedValue({
    indices: [index],
    fields: Object.fromEntries(
      Object.entries(fields).map(([fieldName, mappings]) => [
        fieldName,
        Object.fromEntries(
          [mappings].flat().map((mapping) => {
            const { type, aggregatable } =
              typeof mapping === 'string'
                ? { type: mapping, aggregatable: mapping !== 'text' }
                : mapping;
            return [type, { type, aggregatable, searchable: true, metadata_field: false }];
          })
        ),
      ])
    ),
  });
  return esClient;
};

describe('createControlFieldCapabilitiesResolver', () => {
  it('maps field caps to control field capabilities', async () => {
    const esClient = createFieldCapsEsClient({
      bytes: 'long',
      host: 'text',
      'host.keyword': 'keyword',
      message: { type: 'text', aggregatable: true },
      status: ['keyword', 'text'],
      count: ['long', 'integer'],
      tags: [
        { type: 'text', aggregatable: false },
        { type: 'match_only_text', aggregatable: false },
      ],
    });

    const capabilities = await createControlFieldCapabilitiesResolver({ esClient })({
      index,
      fieldNames: ['bytes'],
    });

    expect(Object.fromEntries(capabilities)).toEqual({
      bytes: { status: 'usable', type: 'long' },
      host: { status: 'not_aggregatable' },
      'host.keyword': { status: 'usable', type: 'keyword' },
      message: { status: 'usable', type: 'text' },
      status: { status: 'conflicting' },
      count: { status: 'conflicting' },
      tags: { status: 'not_aggregatable' },
    });
  });

  it('requests each field once with the project routing', async () => {
    const esClient = createFieldCapsEsClient({});

    await createControlFieldCapabilitiesResolver({ esClient })({
      index,
      fieldNames: ['host', 'host.keyword', 'host'],
      projectRouting: '_alias:*',
    });

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({
        index,
        fields: ['host', 'host.keyword'],
        project_routing: '_alias:*',
      })
    );
  });

  it('omits project routing when the dashboard has none', async () => {
    const esClient = createFieldCapsEsClient({});

    await createControlFieldCapabilitiesResolver({ esClient })({ index, fieldNames: ['host'] });

    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      expect.not.objectContaining({ project_routing: expect.anything() })
    );
  });
});
