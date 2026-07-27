/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { CoreStart } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TaskManagerStartContract, RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { ConnectorTypes } from '../../../common/types/domain/connector/v1';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import { TemplatesMigrationTaskManager } from './templates_migration_task_manager';
import {
  CASES_TEMPLATES_MIGRATION_TASK_TYPE,
  CASES_TEMPLATES_MIGRATION_TASK_ID,
} from './constants';
import { CASE_BACKFILL_RESCHEDULE_DELAY_MS, MAX_CASE_BACKFILL_FAILED_RUNS } from './types';

const createSavedObjectsRepositoryMock = () => ({
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  bulkCreate: jest.fn(),
  bulkUpdate: jest.fn(),
  openPointInTimeForType: jest.fn(),
  closePointInTime: jest.fn(),
});

const createCoreMock = (repo: ReturnType<typeof createSavedObjectsRepositoryMock>) => ({
  savedObjects: {
    createInternalRepository: jest.fn().mockReturnValue(repo),
  },
});

const createUsageCollectionMock = () => {
  const counter = { incrementCounter: jest.fn() };
  const usageCollection = {
    createUsageCounter: jest.fn().mockReturnValue(counter),
  };
  return { usageCollection, counter };
};

const buildConfigureSO = (
  overrides: Partial<{
    id: string;
    owner: string;
    namespaces: string[];
    customFields: unknown[];
    templates: unknown[];
    legacyTemplatesMigrated: boolean;
    legacyCustomFieldsMigrated: boolean;
    legacyCasesMigrated: boolean;
  }> = {}
) => ({
  id: overrides.id ?? 'config-1',
  namespaces: overrides.namespaces ?? ['default'],
  references: [],
  attributes: {
    owner: overrides.owner ?? 'cases',
    connector: { id: 'none', name: 'none', type: '.none', fields: null },
    closure_type: 'close-by-user',
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: { username: 'elastic', email: null, full_name: null },
    updated_at: null,
    updated_by: null,
    customFields: overrides.customFields ?? [],
    templates: overrides.templates ?? [],
    legacyTemplatesMigrated: overrides.legacyTemplatesMigrated,
    legacyCustomFieldsMigrated: overrides.legacyCustomFieldsMigrated,
    legacyCasesMigrated: overrides.legacyCasesMigrated,
  },
});

const buildLegacyCustomField = (
  key: string,
  type = CustomFieldTypes.TEXT,
  defaultValue: string | number | boolean | null = null
) => ({
  key,
  label: `Label for ${key}`,
  type,
  required: false,
  defaultValue,
});

const buildLegacyTemplate = (
  name: string,
  customFieldKeys: string[] = [],
  overrides: Partial<{
    description: string;
    tags: string[];
    caseFields: Record<string, unknown>;
  }> = {}
) => ({
  key: `key-${name}`,
  name,
  description: overrides.description,
  tags: overrides.tags,
  caseFields: {
    customFields: customFieldKeys.map((k) => ({
      key: k,
      type: CustomFieldTypes.TEXT,
      value: null,
    })),
    ...(overrides.caseFields ?? {}),
  },
});

describe('TemplatesMigrationTaskManager', () => {
  let taskManagerSetupMock: ReturnType<typeof taskManagerMock.createSetup>;
  let taskManagerStartMock: ReturnType<typeof taskManagerMock.createStart>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let repo: ReturnType<typeof createSavedObjectsRepositoryMock>;
  let core: ReturnType<typeof createCoreMock>;

  beforeEach(() => {
    taskManagerSetupMock = taskManagerMock.createSetup();
    taskManagerStartMock = taskManagerMock.createStart();
    logger = loggingSystemMock.createLogger();
    repo = createSavedObjectsRepositoryMock();
    core = createCoreMock(repo);

    repo.find.mockResolvedValue({ saved_objects: [], total: 0 });
    repo.create.mockResolvedValue({ id: 'new-id', attributes: {}, references: [], type: 'test' });
    repo.update.mockResolvedValue({ id: 'config-1', attributes: {}, references: [], type: 'test' });
    repo.bulkUpdate.mockResolvedValue({ saved_objects: [] });
    repo.openPointInTimeForType.mockResolvedValue({ id: 'pit-1' });
    repo.closePointInTime.mockResolvedValue({});
  });

  // The task runner now receives a RunContext ({ taskInstance, abortController }). Tests that need
  // to seed resume state or inspect scheduling pass through here.
  const runTask = async (
    manager: TemplatesMigrationTaskManager,
    { state }: { state?: Record<string, unknown> } = {}
  ) => {
    const call = taskManagerSetupMock.registerTaskDefinitions.mock.calls[0];
    const taskDef = call[0][CASES_TEMPLATES_MIGRATION_TASK_TYPE];
    const runner = taskDef.createTaskRunner({
      taskInstance: { state: state ?? {} },
      signal: new AbortController().signal,
    } as unknown as RunContext);
    return runner.run();
  };

  const getTaskRunner = (manager: TemplatesMigrationTaskManager) => {
    const call = taskManagerSetupMock.registerTaskDefinitions.mock.calls[0];
    const taskDefs = call[0];
    const taskDef = taskDefs[CASES_TEMPLATES_MIGRATION_TASK_TYPE];
    return taskDef.createTaskRunner({
      signal: new AbortController().signal,
    } as unknown as RunContext);
  };

  const buildAndSchedule = async (
    usageCollection?: UsageCollectionSetup,
    extraRepoSetup?: () => void
  ) => {
    const manager = new TemplatesMigrationTaskManager(
      taskManagerSetupMock,
      logger,
      usageCollection
    );
    if (extraRepoSetup) extraRepoSetup();
    await manager.scheduleMigrationTask(
      taskManagerStartMock as unknown as TaskManagerStartContract,
      core as unknown as CoreStart
    );
    return manager;
  };

  describe('constructor', () => {
    it('registers the task type', () => {
      new TemplatesMigrationTaskManager(taskManagerSetupMock, logger);
      expect(taskManagerSetupMock.registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({ [CASES_TEMPLATES_MIGRATION_TASK_TYPE]: expect.any(Object) })
      );
    });
  });

  describe('scheduleMigrationTask', () => {
    it('creates an internal repository with the required SO types', async () => {
      await buildAndSchedule();
      expect(core.savedObjects.createInternalRepository).toHaveBeenCalledWith([
        CASE_CONFIGURE_SAVED_OBJECT,
        CASE_TEMPLATE_SAVED_OBJECT,
        CASE_FIELD_DEFINITION_SAVED_OBJECT,
        CASE_SAVED_OBJECT,
      ]);
    });

    it('removes any existing task before rescheduling to ensure a fresh run on startup', async () => {
      await buildAndSchedule();
      expect(taskManagerStartMock.removeIfExists).toHaveBeenCalledWith(
        CASES_TEMPLATES_MIGRATION_TASK_ID
      );
    });

    it('calls ensureScheduled with the migration task id', async () => {
      await buildAndSchedule();
      expect(taskManagerStartMock.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: CASES_TEMPLATES_MIGRATION_TASK_ID })
      );
    });
  });

  describe('task runner run()', () => {
    it('skips a configure SO when all migration flags are already set', async () => {
      repo.find.mockResolvedValueOnce({
        saved_objects: [
          buildConfigureSO({
            legacyTemplatesMigrated: true,
            legacyCustomFieldsMigrated: true,
            legacyCasesMigrated: true,
          }),
        ],
        total: 1,
      });

      const manager = await buildAndSchedule();
      const runner = getTaskRunner(manager);
      await runner.run();

      // Only the one find for configure SOs — no field-def, template, or case lookups
      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('no-ops when configure list is empty', async () => {
      repo.find.mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      const runner = getTaskRunner(manager);
      await runner.run();

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('creates field definitions and templates for a fresh configure SO', async () => {
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        templates: [buildLegacyTemplate('My Template', ['cf_text'])],
      });

      repo.find
        // First call: find all configure SOs
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        // Second call: find existing field-defs for this owner/namespace
        .mockResolvedValueOnce({ saved_objects: [], total: 0 })
        // Third call: find existing templates for this owner/namespace
        .mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      const runner = getTaskRunner(manager);
      await runner.run();

      expect(repo.create).toHaveBeenCalledTimes(2);

      const [fieldDefCall, templateCall] = repo.create.mock.calls;
      expect(fieldDefCall[0]).toBe(CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefCall[1]).toMatchObject({ name: 'cf_text', owner: 'cases', isGlobal: true });

      expect(templateCall[0]).toBe(CASE_TEMPLATE_SAVED_OBJECT);
      expect(templateCall[1]).toMatchObject({
        name: 'My Template',
        owner: 'cases',
        isLatest: true,
        fieldDefinitions: [
          expect.objectContaining({
            name: 'cf_text',
            type: 'keyword',
            control: 'INPUT_TEXT',
          }),
        ],
      });

      // The field/template phase writes those two flags together...
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyTemplatesMigrated: true, legacyCustomFieldsMigrated: true },
        expect.anything()
      );
      // ...and the (empty) case-backfill phase records its own completion flag separately.
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
    });

    it('migrates custom-field default values into the stored field definitions', async () => {
      // Regression guard for the reported "default values were not migrated" concern: exercise the
      // full task path (not just the builder) and assert the persisted field-definition YAML
      // preserves each v1 type's default.
      const configSO = buildConfigureSO({
        customFields: [
          buildLegacyCustomField('cf_text', CustomFieldTypes.TEXT, 'hello'),
          buildLegacyCustomField('cf_num', CustomFieldTypes.NUMBER, 42),
          buildLegacyCustomField('cf_toggle', CustomFieldTypes.TOGGLE, true),
        ],
        templates: [],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const fieldDefByName = new Map(
        repo.create.mock.calls
          .filter((c) => c[0] === CASE_FIELD_DEFINITION_SAVED_OBJECT)
          .map((c) => [c[1].name, parseYaml(c[1].definition) as Record<string, unknown>])
      );

      const textDef = fieldDefByName.get('cf_text') as { metadata?: { default?: unknown } };
      const numDef = fieldDefByName.get('cf_num') as { metadata?: { default?: unknown } };
      const toggleDef = fieldDefByName.get('cf_toggle') as {
        control?: string;
        metadata?: { default?: unknown };
      };

      expect(textDef.metadata?.default).toBe('hello');
      expect(numDef.metadata?.default).toBe(42);
      expect(toggleDef.control).toBe('TOGGLE');
      expect(toggleDef.metadata?.default).toBe(true);
    });

    it('preserves template metadata while keeping case defaults as top-level definition keys', async () => {
      const configSO = buildConfigureSO({
        templates: [
          buildLegacyTemplate('Template metadata name', [], {
            description: 'Template metadata description',
            tags: ['metadata-tag'],
            caseFields: {
              title: 'Case default title',
              description: 'Case default description',
              tags: ['case-tag'],
              severity: 'critical',
              category: 'malware',
              assignees: [{ uid: 'analyst-1' }],
            },
          }),
        ],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const templateCreateCall = repo.create.mock.calls.find(
        (c) => c[0] === CASE_TEMPLATE_SAVED_OBJECT
      );
      expect(templateCreateCall).toBeDefined();
      const templateAttributes = templateCreateCall?.[1] as {
        name: string;
        description?: string;
        tags?: string[];
        definition: string;
      };

      expect(templateAttributes.name).toBe('Template metadata name');
      expect(templateAttributes.description).toBe('Template metadata description');
      expect(templateAttributes.tags).toEqual(['metadata-tag']);

      const parsedDefinition = parseYaml(templateAttributes.definition) as {
        name?: string;
        description?: string;
        tags?: string[];
        severity?: string;
        category?: string | null;
        assignees?: Array<{ uid: string }>;
      };
      expect(parsedDefinition.name).toEqual('Case default title');
      expect(parsedDefinition.description).toEqual('Case default description');
      expect(parsedDefinition.tags).toEqual(['case-tag']);
      expect(parsedDefinition.severity).toEqual('critical');
      expect(parsedDefinition.category).toEqual('malware');
      expect(parsedDefinition.assignees).toEqual([{ uid: 'analyst-1' }]);
      expect(parsedDefinition).not.toHaveProperty('case');
    });

    it('migrates a legacy template with a Jira connector into a valid, connector-preserving definition', async () => {
      // Regression guard for the desk-test finding "migration is not picking up connector fields
      // → preview error". Exercise the full task path and assert the persisted definition (a) is
      // valid per ParsedTemplateDefinitionSchema (so the template is created, not skipped) and
      // (b) preserves the Jira connector's fields, dropping only the resolved `name`.
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        templates: [
          buildLegacyTemplate('Jira Template', ['cf_text'], {
            caseFields: {
              title: 'Jira default title',
              connector: {
                id: 'my-connector',
                name: 'My Jira',
                type: ConnectorTypes.jira,
                fields: { issueType: '10001', priority: 'High', parent: null },
              },
            },
          }),
        ],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const templateCreateCall = repo.create.mock.calls.find(
        (c) => c[0] === CASE_TEMPLATE_SAVED_OBJECT
      );
      expect(templateCreateCall).toBeDefined();
      const definition = (templateCreateCall?.[1] as { definition: string }).definition;

      // The migrated definition must validate — an invalid definition would have been skipped and
      // never written, and would fail the preview.
      const result = ParsedTemplateDefinitionSchema.safeParse(parseYaml(definition));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Jira default title');
        expect(result.data.connector).toEqual({
          type: '.jira',
          id: 'my-connector',
          fields: { issueType: '10001', priority: 'High', parent: null },
        });
      }
    });

    it('fully migrates a fleshed-out v1 template: identity → attributes; connector (all sub-fields), settings & case defaults → definition', async () => {
      // The core GA guarantee: a complete legacy template — template identity (name/description/tags),
      // every case default, a fully-populated Jira connector (all sub-fields incl. the free-form
      // otherFields), and both settings — migrates COMPLETELY and losslessly to v2.
      const connectorFields = {
        issueType: '10002',
        priority: 'Highest',
        parent: 'PROJ-42',
        otherFields: '{"customfield_10010":"squad-blue","labels":["triage","p1"]}',
      };
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        templates: [
          buildLegacyTemplate('Security incident template', ['cf_text'], {
            // Template identity — must land on the SO attributes, NOT the definition.
            description: 'Template used by the SOC for suspicious-login incidents',
            tags: ['soc', 'identity-tag'],
            caseFields: {
              // Case defaults — must land in the definition (the blueprint).
              title: 'Investigate suspicious login',
              description: 'Default case description',
              tags: ['triage', 'p1'],
              severity: 'critical',
              category: 'Security',
              assignees: [{ uid: 'analyst-1' }, { uid: 'analyst-2' }],
              connector: {
                id: 'my-connector',
                name: 'My Jira',
                type: ConnectorTypes.jira,
                fields: connectorFields,
              },
              settings: { syncAlerts: true, extractObservables: true },
            },
          }),
        ],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const templateCreateCall = repo.create.mock.calls.find(
        (c) => c[0] === CASE_TEMPLATE_SAVED_OBJECT
      );
      expect(templateCreateCall).toBeDefined();
      const attributes = templateCreateCall?.[1] as { definition: string } & Record<
        string,
        unknown
      >;

      // Identity persisted on the SO attributes (source of truth for identity under Option 2).
      expect(attributes).toMatchObject({
        name: 'Security incident template',
        description: 'Template used by the SOC for suspicious-login incidents',
        tags: ['soc', 'identity-tag'],
      });

      // The definition is the COMPLETE blueprint: schema-valid, with every case default, both
      // settings, and the connector with EVERY sub-field intact (deep-equal, nothing dropped).
      const result = ParsedTemplateDefinitionSchema.safeParse(parseYaml(attributes.definition));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          name: 'Investigate suspicious login',
          description: 'Default case description',
          tags: ['triage', 'p1'],
          severity: 'critical',
          category: 'Security',
          assignees: [{ uid: 'analyst-1' }, { uid: 'analyst-2' }],
          connector: { type: '.jira', id: 'my-connector', fields: connectorFields },
          settings: { syncAlerts: true, extractObservables: true },
        });
        // The custom field survived as a $ref entry.
        expect(result.data.fields).toHaveLength(1);
      }
    });

    it('emits a single aggregate summary log line instead of one per configure SO', async () => {
      // Regression guard for the "overly verbose logging" concern. Three spaces are migrated but
      // only ONE summary INFO line should be produced for the run; per-SO detail is at debug.
      const configs = [
        buildConfigureSO({ id: 'c1', customFields: [buildLegacyCustomField('a')] }),
        buildConfigureSO({ id: 'c2', customFields: [buildLegacyCustomField('b')] }),
        buildConfigureSO({ id: 'c3', customFields: [buildLegacyCustomField('c')] }),
      ];
      // First find returns the configure list; all later per-SO finds use the default empty mock.
      repo.find.mockResolvedValueOnce({ saved_objects: configs, total: 3 });

      const manager = await buildAndSchedule();
      logger.info.mockClear();
      await getTaskRunner(manager).run();

      const infoMessages = logger.info.mock.calls.map((c) => String(c[0]));
      const summaryLines = infoMessages.filter((m) =>
        m.includes('Cases templates v2 migration run complete')
      );
      const perSoInfoLines = infoMessages.filter((m) => m.includes('Migrated configure SO'));

      expect(summaryLines).toHaveLength(1);
      expect(perSoInfoLines).toHaveLength(0);
      expect(summaryLines[0]).toContain('migrated=3');
    });

    it('sets isGlobal: true on every migrated field definition', async () => {
      const configSO = buildConfigureSO({
        customFields: [
          buildLegacyCustomField('cf_text', CustomFieldTypes.TEXT),
          buildLegacyCustomField('cf_num', CustomFieldTypes.NUMBER),
        ],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }) // field-defs
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const fieldDefCreates = repo.create.mock.calls.filter(
        (c) => c[0] === CASE_FIELD_DEFINITION_SAVED_OBJECT
      );
      expect(fieldDefCreates).toHaveLength(2);
      for (const call of fieldDefCreates) {
        expect(call[1]).toMatchObject({ isGlobal: true });
      }
    });

    it('reuses existing field definitions by name and does not duplicate', async () => {
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        templates: [buildLegacyTemplate('My Template', ['cf_text'])],
      });

      const existingFieldDef = {
        id: 'existing-fd',
        type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
        references: [],
        // Matching definition so no warn is emitted
        attributes: {
          name: 'cf_text',
          owner: 'cases',
          definition: 'name: cf_text\ncontrol: INPUT_TEXT\ntype: keyword\n',
          fieldDefinitionId: 'x',
        },
      };

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [existingFieldDef], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // Only one create — for the template; field-def is reused
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create.mock.calls[0][0]).toBe(CASE_TEMPLATE_SAVED_OBJECT);
    });

    it('logs a warning when a reused field definition has a mismatched control type', async () => {
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')], // TEXT → expects INPUT_TEXT
      });

      const existingFieldDef = {
        id: 'existing-fd',
        type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
        references: [],
        attributes: {
          name: 'cf_text',
          owner: 'cases',
          // A TEXT legacy field would produce control: INPUT_TEXT — this has INPUT_NUMBER
          definition: 'name: cf_text\ncontrol: INPUT_NUMBER\ntype: integer\n',
          fieldDefinitionId: 'x',
        },
      };

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [existingFieldDef], total: 1 }) // field-defs
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('control="INPUT_NUMBER"'));
      // Field is still reused — no new field-def created
      expect(repo.create).not.toHaveBeenCalledWith(
        CASE_FIELD_DEFINITION_SAVED_OBJECT,
        expect.anything(),
        expect.anything()
      );
    });

    it('reuses existing templates by name and does not duplicate', async () => {
      const configSO = buildConfigureSO({
        // no customFields → skips field-def find; only templates find is made
        templates: [buildLegacyTemplate('Existing Template')],
      });

      const existingTemplate = {
        id: 'existing-tmpl',
        type: CASE_TEMPLATE_SAVED_OBJECT,
        references: [],
        attributes: { name: 'Existing Template', owner: 'cases', isLatest: true },
      };

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        // No field-defs find (empty customFields skips that code path)
        .mockResolvedValueOnce({ saved_objects: [existingTemplate], total: 1 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // No creates — template reused
      expect(repo.create).not.toHaveBeenCalled();
      // Both flags written even though there were no custom fields at migration time
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyTemplatesMigrated: true, legacyCustomFieldsMigrated: true },
        expect.anything()
      );
    });

    it('still writes flags even when template create fails (best-effort behaviour)', async () => {
      const configSO = buildConfigureSO({
        templates: [buildLegacyTemplate('My Template')],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      repo.create.mockRejectedValueOnce(new Error('ES write failed'));

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // Per-item failures are caught and logged; both flags are still written to avoid
      // re-processing on the next restart (intentional best-effort behaviour).
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyTemplatesMigrated: true, legacyCustomFieldsMigrated: true },
        expect.anything()
      );
    });

    it('rejects a template with an invalid YAML definition and logs the error', async () => {
      // buildTemplateYaml always emits syntactically valid YAML, but ParsedTemplateDefinitionSchema
      // can still reject semantically invalid values. Use an unsupported severity value to exercise
      // the safeParse error path.
      const configSO = buildConfigureSO({
        templates: [{ key: 'k', name: 'T', caseFields: { severity: 'urgent' } }],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }) // field-defs
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // The template create is never called because safeParse throws before repo.create
      expect(repo.create).not.toHaveBeenCalledWith(
        CASE_TEMPLATE_SAVED_OBJECT,
        expect.anything(),
        expect.anything()
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('produced an invalid definition')
      );
    });

    it('skips legacy templates with empty names and logs the error', async () => {
      const configSO = buildConfigureSO({
        templates: [buildLegacyTemplate('')],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }) // field-defs
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      expect(repo.create).not.toHaveBeenCalledWith(
        CASE_TEMPLATE_SAVED_OBJECT,
        expect.anything(),
        expect.anything()
      );
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('empty name'));
    });

    it('continues to next configure SO even if one fails entirely', async () => {
      // config-1 has a template that will fail to look up; config-2 has a template that succeeds.
      // Using filter-based discrimination avoids ordering issues from concurrent pMap execution.
      const configSO1 = buildConfigureSO({
        id: 'config-1',
        owner: 'cases',
        templates: [buildLegacyTemplate('T1')],
      });
      const configSO2 = buildConfigureSO({
        id: 'config-2',
        owner: 'securitySolution',
        templates: [buildLegacyTemplate('T2')],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO1, configSO2], total: 2 })
        .mockImplementation((query: { filter?: string }) => {
          if (typeof query.filter === 'string' && query.filter.includes('"cases"')) {
            return Promise.reject(new Error('template lookup failed for config-1'));
          }
          return Promise.resolve({ saved_objects: [], total: 0 });
        });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // config-2 still gets processed despite config-1 failing
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        'config-2',
        expect.anything(),
        expect.anything()
      );
    });

    it('handles a configure SO with no customFields and no templates', async () => {
      const configSO = buildConfigureSO({ customFields: [], templates: [] });

      repo.find.mockResolvedValueOnce({ saved_objects: [configSO], total: 1 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // No SO creates; no flags written (empty arrays — flags are set only when there is data to
      // migrate, so the next startup can detect newly-added custom fields or templates).
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('runs field-def phase but skips template phase when legacyTemplatesMigrated is already true', async () => {
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        templates: [buildLegacyTemplate('T', ['cf_text'])],
        legacyTemplatesMigrated: true,
        legacyCustomFieldsMigrated: false,
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // field-defs find

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // Field-def phase must run (flag is false), template phase must not (flag already true)
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create.mock.calls[0][0]).toBe(CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(repo.create.mock.calls[0][1]).toMatchObject({ name: 'cf_text', isGlobal: true });

      // Field/template phase writes only the custom fields flag (templates flag already true)...
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCustomFieldsMigrated: true },
        expect.anything()
      );
      // ...and the case-backfill phase records its completion flag separately.
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
      expect(repo.update.mock.calls[0][2]).not.toHaveProperty('legacyTemplatesMigrated');
    });

    it('does not add flags that are already true', async () => {
      const configSO = buildConfigureSO({
        customFields: [],
        templates: [buildLegacyTemplate('T')],
        legacyCustomFieldsMigrated: true, // already done
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyTemplatesMigrated: true },
        expect.anything()
      );
      expect(repo.update.mock.calls[0][2]).not.toHaveProperty('legacyCustomFieldsMigrated');
    });

    it('uses the configure SO namespace for field-def and template finds', async () => {
      const configSO = buildConfigureSO({
        namespaces: ['my-space'],
        // Need at least one customField to trigger the field-def find
        customFields: [buildLegacyCustomField('cf_text')],
        templates: [buildLegacyTemplate('T', ['cf_text'])],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configSO], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }) // field-defs
        .mockResolvedValueOnce({ saved_objects: [], total: 0 }); // templates

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // The second find (field-defs) should have namespaces: ['my-space']
      const fieldDefFindCall = repo.find.mock.calls[1];
      expect(fieldDefFindCall[0].namespaces).toEqual(['my-space']);
    });

    it('migrates configure SOs from different namespaces independently with correct namespace scoping', async () => {
      const configDefault = buildConfigureSO({
        id: 'config-default',
        namespaces: ['default'],
        customFields: [buildLegacyCustomField('cf_default')],
      });
      const configMySpace = buildConfigureSO({
        id: 'config-my-space',
        namespaces: ['my-space'],
        customFields: [buildLegacyCustomField('cf_myspace')],
      });

      repo.find
        .mockResolvedValueOnce({ saved_objects: [configDefault, configMySpace], total: 2 })
        // Remaining finds (2 field-def + 2 template) return empty regardless of order
        .mockResolvedValue({ saved_objects: [], total: 0 });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const fieldDefCreates = repo.create.mock.calls.filter(
        (c) => c[0] === CASE_FIELD_DEFINITION_SAVED_OBJECT
      );
      // One field-def per namespace
      expect(fieldDefCreates).toHaveLength(2);

      // default namespace uses undefined (omitted) option; my-space uses 'my-space'
      const namespaceOptions = fieldDefCreates.map((c) => c[2]?.namespace);
      expect(namespaceOptions).toContain(undefined);
      expect(namespaceOptions).toContain('my-space');
    });
  });

  describe('existing-case extended_fields backfill', () => {
    const buildCaseSO = (
      id: string,
      customFields: unknown[],
      extendedFields?: Record<string, unknown> | null
    ) => ({
      id,
      type: CASE_SAVED_OBJECT,
      references: [],
      attributes: { owner: 'cases', customFields, extended_fields: extendedFields ?? null },
    });

    // Routes each find() to the right result by SO type, so the case-backfill find is deterministic
    // regardless of the phase ordering.
    const mockFindByType = (configSO: unknown, caseSOs: unknown[]) => {
      repo.find.mockImplementation((opts: { type: string }) => {
        if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: [configSO], total: 1 });
        }
        if (opts.type === CASE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: caseSOs, total: caseSOs.length });
        }
        return Promise.resolve({ saved_objects: [], total: 0 });
      });
    };

    it('backfills extended_fields on existing cases from their legacy customFields', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      const caseSO = buildCaseSO('case-1', [
        { key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' },
        { key: 'cf_num', type: CustomFieldTypes.NUMBER, value: 5 },
      ]);
      mockFindByType(configSO, [caseSO]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      expect(repo.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(repo.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          type: CASE_SAVED_OBJECT,
          id: 'case-1',
          attributes: { extended_fields: { cf_text_as_keyword: 'hello', cf_num_as_integer: '5' } },
        }),
      ]);
    });

    it('does not overwrite extended_fields values already set on a case', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      const caseSO = buildCaseSO(
        'case-1',
        [
          { key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'from-legacy' },
          { key: 'cf_num', type: CustomFieldTypes.NUMBER, value: 5 },
        ],
        { cf_text_as_keyword: 'already-set' }
      );
      mockFindByType(configSO, [caseSO]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      expect(repo.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          id: 'case-1',
          attributes: {
            extended_fields: { cf_text_as_keyword: 'already-set', cf_num_as_integer: '5' },
          },
        }),
      ]);
    });

    it('does not update cases that already have all their extended_fields', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      const caseSO = buildCaseSO(
        'case-1',
        [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'x' }],
        { cf_text_as_keyword: 'x' }
      );
      mockFindByType(configSO, [caseSO]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      expect(repo.bulkUpdate).not.toHaveBeenCalled();
    });

    it('scopes the case query to the configure SO owner and namespace', async () => {
      const configSO = buildConfigureSO({
        owner: 'securitySolution',
        namespaces: ['my-space'],
        customFields: [buildLegacyCustomField('cf_text')],
      });
      mockFindByType(configSO, []);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // The PIT is opened scoped to the space's namespace...
      expect(repo.openPointInTimeForType).toHaveBeenCalledWith(
        CASE_SAVED_OBJECT,
        expect.objectContaining({ namespaces: ['my-space'] })
      );
      // ...and the case scan filters by owner within that PIT, scoped to the same namespace as the
      // PIT. `namespaces` must be on the `find` too: the migration's internal repo is unscoped (no
      // spaces extension), and without it `find` defaults to the `default` space — returning the
      // wrong space's cases, which then 404 on bulkUpdate against this space.
      const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFind?.[0]).toEqual(
        expect.objectContaining({
          type: CASE_SAVED_OBJECT,
          namespaces: ['my-space'],
          filter: `${CASE_SAVED_OBJECT}.attributes.owner: "securitySolution"`,
          pit: expect.objectContaining({ id: 'pit-1' }),
        })
      );
    });

    it('backfills a non-default space in its own namespace (find + bulkUpdate stay on the same space)', async () => {
      // Regression guard for the "37/37 not found (404)" bug: the find must be scoped to the space's
      // namespace, and the resulting bulkUpdate must target that same namespace so the cases the
      // scan returned actually resolve.
      const configSO = buildConfigureSO({
        owner: 'securitySolution',
        namespaces: ['analytics-1'],
        customFields: [buildLegacyCustomField('cf_text')],
      });
      mockFindByType(configSO, [
        buildCaseSO('case-1', [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' }]),
      ]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFind?.[0]).toEqual(expect.objectContaining({ namespaces: ['analytics-1'] }));

      // The update lands in the space's namespace — not the default namespace.
      expect(repo.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(repo.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({ id: 'case-1', namespace: 'analytics-1' }),
      ]);
    });

    it('backfills cases for a space a prior release already marked field/template-migrated', async () => {
      // legacyCasesMigrated is unset, so the space must NOT be skipped and cases must be backfilled.
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        legacyCustomFieldsMigrated: true,
        legacyTemplatesMigrated: true,
      });
      const caseSO = buildCaseSO('case-1', [
        { key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' },
      ]);
      mockFindByType(configSO, [caseSO]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // No field-defs re-created (already migrated) but the case IS backfilled...
      expect(repo.bulkUpdate).toHaveBeenCalledTimes(1);
      // ...and the case flag is now recorded so the space is skipped next time.
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
    });

    it('skips the case-backfill phase when the space has no custom fields', async () => {
      const configSO = buildConfigureSO({
        customFields: [],
        templates: [buildLegacyTemplate('T')],
      });
      mockFindByType(configSO, [buildCaseSO('case-1', [])]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFind).toBeUndefined();
      expect(repo.bulkUpdate).not.toHaveBeenCalled();
    });

    it('skips not-found (404) case updates and still completes the space', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      const caseSO = buildCaseSO('case-1', [
        { key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' },
      ]);
      mockFindByType(configSO, [caseSO]);
      // A 404 means the case can't be resolved for update (deleted, or a stored id/namespace that
      // doesn't line up) — retrying will never succeed.
      repo.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'case-1',
            type: CASE_SAVED_OBJECT,
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [cases/case-1] not found',
            },
          },
        ],
      });

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      // The space is still flagged complete (not retried forever) despite the unresolvable case.
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
    });
  });

  describe('existing-case backfill at scale (resumable)', () => {
    const PAGE_SIZE = 1000;
    const SCAN_BUDGET = 25000;

    // A full page of trivial cases (no customFields → scanned but not updated), reused across finds.
    const fullPage = (sortValue: number) => ({
      saved_objects: Array.from({ length: PAGE_SIZE }, (_, i) => ({
        id: `case-${sortValue}-${i}`,
        type: CASE_SAVED_OBJECT,
        references: [],
        attributes: { owner: 'cases', customFields: [], extended_fields: null },
        sort: [sortValue],
      })),
      total: PAGE_SIZE,
      pit_id: `pit-${sortValue}`,
    });

    const routeConfigureAndCases = (configSO: unknown, casePages: unknown[]) => {
      let caseCall = 0;
      repo.find.mockImplementation((opts: { type: string }) => {
        if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: [configSO], total: 1 });
        }
        if (opts.type === CASE_SAVED_OBJECT) {
          const pageResult = casePages[Math.min(caseCall, casePages.length - 1)];
          caseCall++;
          return Promise.resolve(pageResult);
        }
        return Promise.resolve({ saved_objects: [], total: 0 });
      });
    };

    it('pages through cases with search_after and completes when the last page is partial', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      const page1 = fullPage(1);
      const page2 = {
        saved_objects: [
          {
            id: 'last-case',
            type: CASE_SAVED_OBJECT,
            references: [],
            attributes: {
              owner: 'cases',
              customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'v' }],
              extended_fields: null,
            },
            sort: [2],
          },
        ],
        total: 1,
        pit_id: 'pit-2',
      };
      routeConfigureAndCases(configSO, [page1, page2]);

      const manager = await buildAndSchedule();
      const result = await getTaskRunner(manager).run();

      // Second case find resumes from the first page's last sort value.
      const caseFinds = repo.find.mock.calls.filter((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFinds).toHaveLength(2);
      expect(caseFinds[1][0]).toEqual(expect.objectContaining({ searchAfter: [1] }));

      // Exhausted → PIT closed, flag set, task deleted (no reschedule).
      expect(repo.closePointInTime).toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    });

    it('reschedules with a resume cursor when the per-run scan budget is exhausted', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      // Always return full pages so the scan never exhausts and the budget is what stops it.
      routeConfigureAndCases(configSO, [fullPage(1)]);

      const manager = await buildAndSchedule();
      const result = await getTaskRunner(manager).run();

      // 25000 budget / 1000 page size = 25 pages before the run yields.
      const caseFinds = repo.find.mock.calls.filter((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFinds).toHaveLength(SCAN_BUDGET / PAGE_SIZE);

      // Not complete: reschedules with a persisted cursor, does NOT set the flag or delete the task.
      expect(result).toEqual(
        expect.objectContaining({
          runAt: expect.any(Date),
          state: { caseBackfill: expect.objectContaining({ configureId: configSO.id }) },
        })
      );
      expect(repo.update).not.toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
      expect(repo.closePointInTime).not.toHaveBeenCalled();
    });

    it('resumes from a persisted cursor without reopening a PIT', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      // Partial page → exhausts immediately once resumed.
      routeConfigureAndCases(configSO, [{ saved_objects: [], total: 0, pit_id: 'pit-resumed' }]);

      const manager = await buildAndSchedule();
      await runTask(manager, {
        state: {
          caseBackfill: {
            configureId: configSO.id,
            owner: 'cases',
            namespace: 'default',
            pitId: 'pit-resumed',
            searchAfter: [42],
          },
        },
      });

      // Resumed → no new PIT opened, and the scan continues from the saved search_after.
      expect(repo.openPointInTimeForType).not.toHaveBeenCalled();
      const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFind?.[0]).toEqual(
        expect.objectContaining({
          pit: expect.objectContaining({ id: 'pit-resumed' }),
          searchAfter: [42],
        })
      );
    });

    it('does not mark a space complete when a bulkUpdate page reports item errors', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      routeConfigureAndCases(configSO, [
        {
          saved_objects: [
            {
              id: 'case-err',
              type: CASE_SAVED_OBJECT,
              references: [],
              attributes: {
                owner: 'cases',
                customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'v' }],
                extended_fields: null,
              },
              sort: [1],
            },
          ],
          total: 1,
          pit_id: 'pit-1',
        },
      ]);
      repo.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'case-err', type: CASE_SAVED_OBJECT, error: { message: 'conflict' } },
        ],
      });

      const manager = await buildAndSchedule();
      const result = await getTaskRunner(manager).run();

      // The failed page must NOT flag the space migrated; it reschedules to retry.
      expect(repo.update).not.toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
      expect(result).toEqual(expect.objectContaining({ runAt: expect.any(Date) }));
    });

    it('reopens the PIT and rescans the space if a resumed PIT is invalid', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      let caseCall = 0;
      repo.find.mockImplementation((opts: { type: string }) => {
        if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: [configSO], total: 1 });
        }
        if (opts.type === CASE_SAVED_OBJECT) {
          caseCall++;
          if (caseCall === 1) {
            return Promise.reject(new Error('search_context_missing_exception'));
          }
          return Promise.resolve({ saved_objects: [], total: 0, pit_id: 'pit-fresh' });
        }
        return Promise.resolve({ saved_objects: [], total: 0 });
      });

      const manager = await buildAndSchedule();
      await runTask(manager, {
        state: {
          caseBackfill: {
            configureId: configSO.id,
            owner: 'cases',
            namespace: 'default',
            pitId: 'pit-stale',
            searchAfter: [10],
          },
        },
      });

      // Recovered: reopened a fresh PIT and completed the space.
      expect(repo.openPointInTimeForType).toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        configSO.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
    });

    it('scans without a sortField so the PIT applies the unique _shard_doc tiebreaker', async () => {
      // Guards against a search_after skip bug: sorting by a non-unique field (e.g. created_at)
      // drops the _shard_doc tiebreaker, so cases sharing the boundary value would be skipped.
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      routeConfigureAndCases(configSO, [{ saved_objects: [], total: 0, pit_id: 'pit-1' }]);

      const manager = await buildAndSchedule();
      await getTaskRunner(manager).run();

      const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
      expect(caseFind?.[0]).toEqual(
        expect.objectContaining({ pit: expect.objectContaining({ id: 'pit-1' }) })
      );
      expect(caseFind?.[0]).not.toHaveProperty('sortField');
      expect(caseFind?.[0]).not.toHaveProperty('sortOrder');
    });
  });

  describe('bounded failure handling', () => {
    const caseWithLegacyField = (id: string, owner = 'cases') => ({
      id,
      type: CASE_SAVED_OBJECT,
      references: [],
      attributes: {
        owner,
        customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'v' }],
        extended_fields: null,
      },
      sort: [id],
    });

    // Routes configure + per-owner case finds; each owner's cases are served once (then empty, so
    // the space exhausts). The case find is matched to an owner via its `filter` string.
    const routeByOwner = (configSOs: unknown[], casesByOwner: Record<string, unknown[]>) => {
      const served = new Set<string>();
      repo.find.mockImplementation((opts: { type: string; filter?: string }) => {
        if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: configSOs, total: configSOs.length });
        }
        if (opts.type === CASE_SAVED_OBJECT) {
          const owner = Object.keys(casesByOwner).find((o) =>
            String(opts.filter).includes(`"${o}"`)
          );
          if (owner && !served.has(owner)) {
            served.add(owner);
            const cases = casesByOwner[owner];
            return Promise.resolve({ saved_objects: cases, total: cases.length, pit_id: 'pit-1' });
          }
          return Promise.resolve({ saved_objects: [], total: 0, pit_id: 'pit-1' });
        }
        return Promise.resolve({ saved_objects: [], total: 0 });
      });
    };

    it('a persistently failing space does not starve other spaces in the same run', async () => {
      const cfgA = buildConfigureSO({
        id: 'cfgA',
        owner: 'securitySolution',
        customFields: [buildLegacyCustomField('cf_text')],
      });
      const cfgB = buildConfigureSO({
        id: 'cfgB',
        owner: 'observability',
        customFields: [buildLegacyCustomField('cf_text')],
      });
      routeByOwner([cfgA, cfgB], {
        securitySolution: [caseWithLegacyField('a1', 'securitySolution')],
        observability: [caseWithLegacyField('b1', 'observability')],
      });
      // security's update fails; observability's succeeds.
      repo.bulkUpdate.mockImplementation((updates: Array<{ id: string }>) =>
        Promise.resolve({
          saved_objects: updates.map((u) =>
            u.id === 'a1'
              ? { id: u.id, type: CASE_SAVED_OBJECT, error: { message: 'boom' } }
              : { id: u.id, type: CASE_SAVED_OBJECT }
          ),
        })
      );

      const manager = await buildAndSchedule();
      const result = await getTaskRunner(manager).run();

      // The healthy space completes even though the failing one didn't...
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        'cfgB',
        { legacyCasesMigrated: true },
        expect.anything()
      );
      expect(repo.update).not.toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        'cfgA',
        { legacyCasesMigrated: true },
        expect.anything()
      );
      // ...and the run reschedules (still incomplete) recording one failing run.
      expect(result).toEqual(
        expect.objectContaining({
          runAt: expect.any(Date),
          state: expect.objectContaining({ failedRuns: 1 }),
        })
      );
    });

    it('gives up (deletes the task) after the max consecutive failing runs', async () => {
      const cfg = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      routeByOwner([cfg], { cases: [caseWithLegacyField('c1')] });
      repo.bulkUpdate.mockResolvedValue({
        saved_objects: [{ id: 'c1', type: CASE_SAVED_OBJECT, error: { message: 'boom' } }],
      });

      const manager = await buildAndSchedule();
      // Resume as if one run short of the cap already failed.
      const result = await runTask(manager, {
        state: { failedRuns: MAX_CASE_BACKFILL_FAILED_RUNS - 1 },
      });

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Giving up'));
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    });

    it('increments failedRuns and backs off the reschedule when a run has update failures', async () => {
      const cfg = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      routeByOwner([cfg], { cases: [caseWithLegacyField('c1')] });
      repo.bulkUpdate.mockResolvedValue({
        saved_objects: [{ id: 'c1', type: CASE_SAVED_OBJECT, error: { message: 'boom' } }],
      });

      const manager = await buildAndSchedule();
      const before = Date.now();
      const result = (await getTaskRunner(manager).run()) as {
        state: { failedRuns?: number };
        runAt: Date;
      };

      expect(result.state).toEqual(expect.objectContaining({ failedRuns: 1 }));
      // Longer failure backoff, not the happy-path delay.
      expect(result.runAt.getTime() - before).toBeGreaterThan(CASE_BACKFILL_RESCHEDULE_DELAY_MS);
    });

    it('resets failedRuns after a run that stops only for budget (no failures)', async () => {
      // 1000-case pages that never fail → the scan budget is what stops the run (a clean pause),
      // so a prior failure streak must reset to zero.
      const fullPage = {
        saved_objects: Array.from({ length: 1000 }, (_, i) => ({
          id: `c-${i}`,
          type: CASE_SAVED_OBJECT,
          references: [],
          attributes: { owner: 'cases', customFields: [], extended_fields: null },
          sort: [i],
        })),
        total: 1000,
        pit_id: 'pit-1',
      };
      const cfg = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      repo.find.mockImplementation((opts: { type: string }) => {
        if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: [cfg], total: 1 });
        }
        if (opts.type === CASE_SAVED_OBJECT) {
          return Promise.resolve(fullPage);
        }
        return Promise.resolve({ saved_objects: [], total: 0 });
      });

      const manager = await buildAndSchedule();
      const result = (await runTask(manager, { state: { failedRuns: 3 } })) as {
        state: { failedRuns?: number };
        runAt?: Date;
      };

      expect(result.runAt).toEqual(expect.any(Date));
      expect(result.state.failedRuns).toBeUndefined();
    });
  });

  // A stateful fake of the cases index that models a PIT scan the way the real SO repo does when no
  // sortField is given: results are ordered by a unique per-doc tiebreaker (like `_shard_doc`), and
  // `searchAfter` returns strictly the docs after that tiebreaker. bulkUpdate mutates the docs in
  // place. This exercises the real pagination control flow — proving no case is skipped or visited
  // twice across page boundaries even when many share the same `created_at`. (A true end-to-end test
  // against real Elasticsearch is a recommended follow-up; there is no jest-integration harness for
  // this startup task today.)
  describe('faithful PIT pagination (skip-safety)', () => {
    it('backfills every case across multiple pages when they all share a created_at', async () => {
      const TOTAL = 2500; // 3 pages at CASE_BACKFILL_PAGE_SIZE (1000)
      const docs = Array.from({ length: TOTAL }, (_, i) => ({
        id: `case-${i}`,
        // Identical created_at for all — the old created_at sort would have skipped some here.
        attributes: {
          owner: 'cases',
          created_at: '2024-01-01T00:00:00.000Z',
          customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: `v-${i}` }],
          extended_fields: null as Record<string, unknown> | null,
        },
      }));

      const cfg = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      let pitCounter = 0;
      repo.openPointInTimeForType.mockImplementation(() =>
        Promise.resolve({ id: `pit-${++pitCounter}` })
      );
      repo.find.mockImplementation(
        (opts: { type: string; searchAfter?: number[]; perPage: number }) => {
          if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
            return Promise.resolve({ saved_objects: [cfg], total: 1 });
          }
          // No sortField → order by array index (the unique `_shard_doc`-like tiebreaker).
          const after = opts.searchAfter ? opts.searchAfter[0] : -1;
          const start = after + 1;
          const pageDocs = docs.slice(start, start + opts.perPage).map((d, i) => ({
            id: d.id,
            type: CASE_SAVED_OBJECT,
            references: [],
            attributes: d.attributes,
            sort: [start + i],
          }));
          return Promise.resolve({ saved_objects: pageDocs, total: TOTAL, pit_id: 'pit-scan' });
        }
      );
      repo.bulkUpdate.mockImplementation(
        (
          updates: Array<{ id: string; attributes: { extended_fields: Record<string, unknown> } }>
        ) => {
          for (const u of updates) {
            const doc = docs.find((d) => d.id === u.id);
            if (doc) doc.attributes.extended_fields = u.attributes.extended_fields;
          }
          return Promise.resolve({
            saved_objects: updates.map((u) => ({ id: u.id, type: CASE_SAVED_OBJECT })),
          });
        }
      );

      const manager = await buildAndSchedule();
      const result = await getTaskRunner(manager).run();

      // Every case was backfilled exactly once — none skipped at a page boundary.
      const backfilled = docs.filter(
        (d) => d.attributes.extended_fields?.cf_text_as_keyword != null
      );
      expect(backfilled).toHaveLength(TOTAL);
      expect(docs[0].attributes.extended_fields).toEqual({ cf_text_as_keyword: 'v-0' });
      expect(docs[TOTAL - 1].attributes.extended_fields).toEqual({
        cf_text_as_keyword: `v-${TOTAL - 1}`,
      });
      // Fully done → task deleted, space flagged.
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
      expect(repo.update).toHaveBeenCalledWith(
        CASE_CONFIGURE_SAVED_OBJECT,
        cfg.id,
        { legacyCasesMigrated: true },
        expect.anything()
      );
    });
  });

  describe('telemetry counters', () => {
    it('increments configureMigrationSuccess after a successful migration', async () => {
      const { usageCollection, counter } = createUsageCollectionMock();
      repo.find.mockResolvedValueOnce({
        saved_objects: [buildConfigureSO({ customFields: [], templates: [] })],
        total: 1,
      });

      await getTaskRunner(
        await buildAndSchedule(usageCollection as unknown as UsageCollectionSetup)
      ).run();

      expect(counter.incrementCounter).toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'configureMigrationSuccess', incrementBy: 1 })
      );
    });

    it('increments configureMigrationError when migrateOneConfigure throws', async () => {
      const { usageCollection, counter } = createUsageCollectionMock();
      repo.find
        .mockResolvedValueOnce({
          saved_objects: [buildConfigureSO({ customFields: [buildLegacyCustomField('cf')] })],
          total: 1,
        })
        // field-def find throws → migrateOneConfigure propagates the error
        .mockRejectedValueOnce(new Error('network error'));

      await getTaskRunner(
        await buildAndSchedule(usageCollection as unknown as UsageCollectionSetup)
      ).run();

      expect(counter.incrementCounter).toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'configureMigrationError', incrementBy: 1 })
      );
      expect(counter.incrementCounter).not.toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'configureMigrationSuccess' })
      );
    });

    it('increments configureMigrationSkipped when all migration flags are already set', async () => {
      const { usageCollection, counter } = createUsageCollectionMock();
      repo.find.mockResolvedValueOnce({
        saved_objects: [
          buildConfigureSO({
            legacyTemplatesMigrated: true,
            legacyCustomFieldsMigrated: true,
            legacyCasesMigrated: true,
          }),
        ],
        total: 1,
      });

      await getTaskRunner(
        await buildAndSchedule(usageCollection as unknown as UsageCollectionSetup)
      ).run();

      expect(counter.incrementCounter).toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'configureMigrationSkipped', incrementBy: 1 })
      );
      expect(counter.incrementCounter).not.toHaveBeenCalledWith(
        expect.objectContaining({ counterName: 'configureMigrationSuccess' })
      );
    });
  });

  // The onCaseBackfillComplete hook is how the templates migration tells cases-analytics v2 to run a
  // one-time full re-index once existing cases' extended_fields are backfilled. It must fire exactly
  // once per real migration, never on a no-op restart (which would trigger an expensive full re-index
  // every startup), and never break or retry the migration task if it fails.
  describe('analytics backfill completion hook (onCaseBackfillComplete)', () => {
    const buildCaseSO = (
      id: string,
      customFields: unknown[],
      extendedFields?: Record<string, unknown> | null
    ) => ({
      id,
      type: CASE_SAVED_OBJECT,
      references: [],
      attributes: { owner: 'cases', customFields, extended_fields: extendedFields ?? null },
    });

    const mockFindByType = (configSO: unknown, caseSOs: unknown[]) => {
      repo.find.mockImplementation((opts: { type: string }) => {
        if (opts.type === CASE_CONFIGURE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: [configSO], total: 1 });
        }
        if (opts.type === CASE_SAVED_OBJECT) {
          return Promise.resolve({ saved_objects: caseSOs, total: caseSOs.length });
        }
        return Promise.resolve({ saved_objects: [], total: 0 });
      });
    };

    const buildWithHook = async (hook: () => Promise<void> | void) => {
      const manager = new TemplatesMigrationTaskManager(
        taskManagerSetupMock,
        logger,
        undefined,
        hook
      );
      await manager.scheduleMigrationTask(
        taskManagerStartMock as unknown as TaskManagerStartContract,
        core as unknown as CoreStart
      );
      return manager;
    };

    it('fires once when a completing run backfilled existing cases', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      mockFindByType(configSO, [
        buildCaseSO('case-1', [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' }]),
      ]);
      const hook = jest.fn().mockResolvedValue(undefined);

      const result = await getTaskRunner(await buildWithHook(hook)).run();

      expect(repo.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(hook).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    });

    it('fires when the space had pending backfill work even if this run wrote nothing (multi-run finish / post-restart re-scan)', async () => {
      // Space is pending (customFields present, legacyCasesMigrated not set) but every case already
      // has its extended_fields — the boundary case where the completing run writes 0 cases yet the
      // migration genuinely finished outstanding work. The hook must still fire, keyed on the
      // restart-durable pending flags rather than a per-run write count.
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      mockFindByType(configSO, [
        buildCaseSO('case-1', [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'x' }], {
          cf_text_as_keyword: 'x',
        }),
      ]);
      const hook = jest.fn().mockResolvedValue(undefined);

      const result = await getTaskRunner(await buildWithHook(hook)).run();

      expect(repo.bulkUpdate).not.toHaveBeenCalled();
      expect(hook).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    });

    it('does NOT fire on a no-op restart where every space is already fully migrated', async () => {
      // Custom fields present, but the space was already backfilled in a prior run — the exact shape
      // of every Kibana restart after the migration is done. Firing here would run a full analytics
      // re-index on every single startup.
      const configSO = buildConfigureSO({
        customFields: [buildLegacyCustomField('cf_text')],
        legacyTemplatesMigrated: true,
        legacyCustomFieldsMigrated: true,
        legacyCasesMigrated: true,
      });
      mockFindByType(configSO, []);
      const hook = jest.fn().mockResolvedValue(undefined);

      await getTaskRunner(await buildWithHook(hook)).run();

      expect(hook).not.toHaveBeenCalled();
    });

    it('does NOT fire when no space has custom fields (nothing to backfill)', async () => {
      const configSO = buildConfigureSO({
        customFields: [],
        templates: [buildLegacyTemplate('T')],
      });
      mockFindByType(configSO, []);
      const hook = jest.fn().mockResolvedValue(undefined);

      await getTaskRunner(await buildWithHook(hook)).run();

      expect(hook).not.toHaveBeenCalled();
    });

    it('does NOT fire while the backfill is still rescheduling (not a terminal run)', async () => {
      // Full 1000-case pages so the scan budget stops the run mid-backfill: it reschedules rather
      // than completing, so the analytics re-index must wait for the terminal run.
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      const fullPage = {
        saved_objects: Array.from({ length: 1000 }, (_, i) => ({
          id: `c-${i}`,
          type: CASE_SAVED_OBJECT,
          references: [],
          attributes: { owner: 'cases', customFields: [], extended_fields: null },
          sort: [i],
        })),
        total: 1000,
        pit_id: 'pit-1',
      };
      repo.find.mockImplementation((opts: { type: string }) =>
        opts.type === CASE_CONFIGURE_SAVED_OBJECT
          ? Promise.resolve({ saved_objects: [configSO], total: 1 })
          : opts.type === CASE_SAVED_OBJECT
          ? Promise.resolve(fullPage)
          : Promise.resolve({ saved_objects: [], total: 0 })
      );
      const hook = jest.fn().mockResolvedValue(undefined);

      const result = await getTaskRunner(await buildWithHook(hook)).run();

      expect(result).toEqual(expect.objectContaining({ runAt: expect.any(Date) }));
      expect(hook).not.toHaveBeenCalled();
    });

    it('fires on the give-up path when there was pending backfill work', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      mockFindByType(configSO, [
        buildCaseSO('c1', [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'v' }]),
      ]);
      // Every update fails → resuming one run short of the cap makes this run give up and delete.
      repo.bulkUpdate.mockResolvedValue({
        saved_objects: [{ id: 'c1', type: CASE_SAVED_OBJECT, error: { message: 'boom' } }],
      });
      const hook = jest.fn().mockResolvedValue(undefined);

      const result = await runTask(await buildWithHook(hook), {
        state: { failedRuns: MAX_CASE_BACKFILL_FAILED_RUNS - 1 },
      });

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Giving up'));
      expect(hook).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    });

    it('swallows a hook rejection and still completes + deletes the task (no retry loop)', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      mockFindByType(configSO, [
        buildCaseSO('case-1', [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' }]),
      ]);
      const hook = jest.fn().mockRejectedValue(new Error('analytics down'));

      const result = await getTaskRunner(await buildWithHook(hook)).run();

      // The migration is unaffected: it still reports complete and deletes the one-shot task, so
      // Task Manager does not retry and re-fire the hook.
      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('onCaseBackfillComplete hook failed'),
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('does not require a hook — a completing backfill with no hook configured still deletes the task', async () => {
      const configSO = buildConfigureSO({ customFields: [buildLegacyCustomField('cf_text')] });
      mockFindByType(configSO, [
        buildCaseSO('case-1', [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' }]),
      ]);

      const manager = await buildAndSchedule(); // constructed without an onCaseBackfillComplete hook
      const result = await getTaskRunner(manager).run();

      expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    });
  });
});
