/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AgentBuilderPluginSetup,
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  IMPACT_MAP_ATTACHMENT_TYPE,
  SET_IMPACT_MAP_TOOL_ID,
  UPSERT_IMPACT_MAP_CATALOG_TOOL_ID,
} from '../../../common/impact_map/constants';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { InvestigationsForbiddenError } from '../../investigations/services/investigations_forbidden_error';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import {
  formatImpactMapForAgent,
  impactMapAttachment,
  registerImpactMapAttachment,
} from '../attachments/impact_map_attachment_type';
import { ImpactMapCatalogService } from '../services/impact_map_catalog_service';
import { impactMapDocumentId, ImpactMapService } from '../services/impact_map_service';
import {
  BUILT_IN_ENTITY_TYPES,
  BUILT_IN_RELATIONSHIP_TYPES,
} from '../../../common/impact_map/built_in_types';
import type { ImpactMapEntityType } from '../../../common/impact_map/impact_map';
import { STANDARD_METADATA_FIELDS } from '../../../common/impact_map/metadata';
import type { ImpactMapCatalogDocument, ImpactMapDocument } from '../storage/impact_map_storage';
import { createSetImpactMapTool, type SetImpactMapToolParams } from './set_impact_map_tool';
import { createUpsertImpactMapCatalogTool } from './upsert_impact_map_catalog_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';
const MAP_ID = impactMapDocumentId(SPACE_ID, CONVERSATION_ID);

const checkoutMap: SetImpactMapToolParams = {
  title: 'Checkout failures',
  entities: [
    {
      id: 'frontend',
      type_id: 'service',
      label: 'frontend',
      annotations: { role: 'symptom', impacted: true, health: 'degraded', alert_count: 1 },
    },
    {
      id: 'checkout',
      type_id: 'service',
      label: 'checkout',
      annotations: { role: 'root_cause', health: 'critical', alert_count: 5 },
    },
    { id: 'payments-db', type_id: 'payments_postgres', label: 'payments-db' },
  ],
  relationships: [
    { type_id: 'calls', source_id: 'frontend', target_id: 'checkout', on_critical_path: true },
    { type_id: 'calls', source_id: 'checkout', target_id: 'payments-db' },
  ],
  entity_types: [
    { id: 'service', label: 'Service', kind: 'service', icon: { agent_name: 'nodejs' } },
    {
      id: 'payments_postgres',
      label: 'PostgreSQL',
      kind: 'infrastructure',
      icon: { eui_icon: 'logoPostgres' },
    },
  ],
  relationship_types: [{ id: 'calls', label: 'CALLS' }],
};

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
}: { assertCanManage?: jest.Mock } = {}) => {
  const storage = createInMemoryStorage<ImpactMapDocument>();
  const catalogStorage = createInMemoryStorage<ImpactMapCatalogDocument>();
  const service = new ImpactMapService({
    documents: impactMapAttachment.createServiceFromStorage(storage),
    catalog: new ImpactMapCatalogService({ storage: catalogStorage }),
  });

  const registerType = jest.fn();
  registerImpactMapAttachment(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getDocumentService: () => service.getDocumentService(),
      privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
      assertCanReadConversation: jest.fn().mockResolvedValue(undefined),
      logger: loggerMock.create(),
    }
  );
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) => (type === IMPACT_MAP_ATTACHMENT_TYPE ? definition : undefined),
  });

  const privileges: InvestigationsPrivilegesChecker = { assertCanManage, assertCanRead: jest.fn() };
  const deps = {
    getImpactMapService: () => service,
    resolveUser: jest.fn().mockResolvedValue({ username: 'analyst', fullName: null, email: null }),
    privileges,
    logger: loggerMock.create(),
  };
  const tool = createSetImpactMapTool(deps);
  const catalogTool = createUpsertImpactMapCatalogTool(deps);

  const context = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: SPACE_ID,
    attachments,
    runContext: {
      runId: 'run-1',
      stack: [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
    },
  } as unknown as ToolHandlerContext;

  const call = async (params: SetImpactMapToolParams) => {
    const { results } = (await tool.handler(params, context)) as ToolHandlerStandardReturn;
    return results[0];
  };
  const callCatalog = async (params: object) => {
    const { results } = (await catalogTool.handler(params, context)) as ToolHandlerStandardReturn;
    return results[0];
  };

  return { storage, catalogStorage, attachments, tool, catalogTool, call, callCatalog, service };
};

describe('agentic_investigations.set_impact_map', () => {
  it('uses the allow-listed builtin tool ids', () => {
    const { tool, catalogTool } = setup();
    expect(tool.id).toBe(SET_IMPACT_MAP_TOOL_ID);
    expect(catalogTool.id).toBe(UPSERT_IMPACT_MAP_CATALOG_TOOL_ID);
  });

  it('writes the map with a copy of its types, attaches it to the chat, and fills the catalog', async () => {
    const { storage, attachments, call, service } = setup();

    const result = await call(checkoutMap);

    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: { acknowledged: true, attachment_id: MAP_ID, entities: 3, relationships: 2 },
    });
    const stored = storage.entries.get(MAP_ID)?.source;
    expect(stored).toMatchObject({
      spaceId: SPACE_ID,
      conversationId: CONVERSATION_ID,
      title: 'Checkout failures',
      entityTypes: checkoutMap.entity_types,
      relationshipTypes: checkoutMap.relationship_types,
      createdBy: { username: 'analyst' },
    });
    expect(stored?.relationships.map(({ id }) => id)).toEqual([
      'frontend->checkout:calls',
      'checkout->payments-db:calls',
    ]);
    expect(attachments.getAttachmentRecord(MAP_ID)).toMatchObject({
      type: IMPACT_MAP_ATTACHMENT_TYPE,
    });
    expect(attachments.getAttachmentRecord(MAP_ID)).not.toHaveProperty('hidden');
    await expect(service.getCatalogService().get(SPACE_ID)).resolves.toEqual({
      entity_types: checkoutMap.entity_types,
      relationship_types: checkoutMap.relationship_types,
    });
  });

  it('reuses the catalog on a later write that sends no types', async () => {
    const { storage, call } = setup();
    await call(checkoutMap);

    const result = await call({ ...checkoutMap, entity_types: undefined, relationship_types: [] });

    expect(result.data).not.toHaveProperty('warning');
    // Built-in types add their usual metadata fields to the map's copy.
    expect(storage.entries.get(MAP_ID)?.source.entityTypes).toEqual(
      checkoutMap.entity_types?.map((type) => expect.objectContaining(type))
    );
  });

  it('warns when it had to make a type up', async () => {
    const { call } = setup();

    const result = await call({
      entities: [{ id: 'fn', type_id: 'lambda', label: 'fn' }],
      relationships: [],
    });

    expect(result.data).toMatchObject({
      warning: expect.stringContaining('Entity type "lambda" was not in the catalog'),
    });
  });

  it('writes nothing for a graph that cannot be drawn', async () => {
    const { storage, call } = setup();

    const result = await call({
      ...checkoutMap,
      relationships: [{ type_id: 'calls', source_id: 'frontend', target_id: 'ghost' }],
    });

    expect(result.type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });

  it('refuses without the investigations manage privilege', async () => {
    const { storage, call } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
    });

    const result = await call(checkoutMap);

    expect(result.type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });
});

describe('agentic_investigations.upsert_impact_map_catalog', () => {
  it('reads the catalog when called without types', async () => {
    const { callCatalog, catalogStorage } = setup();

    const result = await callCatalog({});

    // A new space starts with the built-in types, which are not stored.
    expect(result.data).toEqual({
      entity_types: BUILT_IN_ENTITY_TYPES,
      relationship_types: BUILT_IN_RELATIONSHIP_TYPES,
      standard_metadata_fields: STANDARD_METADATA_FIELDS,
    });
    expect(catalogStorage.entries.size).toBe(0);
  });

  it('adds types and replaces stored ones by id', async () => {
    const { callCatalog } = setup();
    await callCatalog({ entity_types: [{ id: 'service', label: 'Service', kind: 'service' }] });

    const result = await callCatalog({
      entity_types: [
        { id: 'service', label: 'Microservice', kind: 'service', icon: { agent_name: 'go' } },
      ],
      relationship_types: [{ id: 'calls', label: 'CALLS' }],
    });

    const { entity_types: types } = result.data as { entity_types: ImpactMapEntityType[] };
    // The space's type wins over the built-in one with the same id, and keeps its fields.
    expect(types.find(({ id }) => id === 'service')).toMatchObject({
      label: 'Microservice',
      icon: { agent_name: 'go' },
      metadata_fields: expect.arrayContaining([
        expect.objectContaining({ key: 'service.version' }),
      ]),
    });
    expect(types.find(({ id }) => id === 'k8s.deployment')).toBeDefined();
    expect(result.data).toMatchObject({ standard_metadata_fields: STANDARD_METADATA_FIELDS });
  });
});

describe('formatImpactMapForAgent', () => {
  it('lists entities with their annotations and marks the critical path', () => {
    const text = formatImpactMapForAgent({
      id: MAP_ID,
      spaceId: SPACE_ID,
      conversationId: CONVERSATION_ID,
      entities: checkoutMap.entities,
      relationships: [
        {
          id: 'frontend->checkout:calls',
          type_id: 'calls',
          source_id: 'frontend',
          target_id: 'checkout',
          on_critical_path: true,
        },
      ],
      entityTypes: checkoutMap.entity_types ?? [],
      relationshipTypes: checkoutMap.relationship_types ?? [],
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(text).toContain(
      '- checkout (id checkout, Service): root_cause, health critical, 5 alerts'
    );
    expect(text).toContain('- frontend CALLS checkout [critical path]');
  });
});
