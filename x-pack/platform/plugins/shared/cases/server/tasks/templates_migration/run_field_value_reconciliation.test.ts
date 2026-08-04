/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import type { CasePersistedAttributes } from '../../common/types/case';
import {
  reconcileCaseFields,
  runFieldValueReconciliationPhase,
} from './run_field_value_reconciliation';

const makeDefinition = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
  fieldDefinitionId: 'def-1',
  name: 'my_text',
  owner: 'cases',
  definition: 'name: my_text\nlabel: My Text\ntype: keyword\ncontrol: INPUT_TEXT\n',
  isGlobal: true,
  legacyKey: 'cf_text',
  ...overrides,
});

const textLink = {
  key: 'cf_text',
  type: 'text',
  storageKey: 'my_text_as_keyword',
  definitionId: 'def-1',
};

const toggleLink = {
  key: 'cf_toggle',
  type: 'toggle',
  storageKey: 'my_toggle_as_boolean',
  definitionId: 'def-2',
};

const numberLink = {
  key: 'cf_num',
  type: 'number',
  storageKey: 'my_num_as_integer',
  definitionId: 'def-3',
};

const caseAttributes = (
  customFields: Array<{ key: string; type: string; value: unknown }>,
  extendedFields?: Record<string, unknown> | null
): CasePersistedAttributes =>
  ({
    owner: 'cases',
    customFields,
    extended_fields: extendedFields ?? null,
  } as unknown as CasePersistedAttributes);

describe('reconcileCaseFields', () => {
  it('is a no-op when both representations are semantically equal', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes([{ key: 'cf_text', type: 'text', value: 'same' }], {
        my_text_as_keyword: 'same',
      }),
      [textLink]
    );

    expect(outcome.changes).toBeUndefined();
    expect(outcome.mismatched).toBe(false);
    expect(outcome.diagnostics).toEqual([]);
  });

  it('is a no-op when both representations are empty', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes([{ key: 'cf_text', type: 'text', value: null }], {}),
      [textLink]
    );

    expect(outcome.changes).toBeUndefined();
    expect(outcome.mismatched).toBe(false);
  });

  it('populates v2 from v1 when the storage key is missing', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes([{ key: 'cf_text', type: 'text', value: 'from-v1' }], null),
      [textLink]
    );

    expect(outcome.mismatched).toBe(true);
    expect(outcome.conflicted).toBe(0);
    expect(outcome.changes).toEqual({
      extended_fields: { my_text_as_keyword: 'from-v1' },
    });
  });

  it('populates v1 from v2 when the customFields entry is missing', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes([], { my_toggle_as_boolean: 'true' }),
      [toggleLink]
    );

    expect(outcome.mismatched).toBe(true);
    expect(outcome.changes).toEqual({
      customFields: [{ key: 'cf_toggle', type: 'toggle', value: true }],
    });
  });

  it('lets v2 win (decoded into v1) when both are present and different', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes([{ key: 'cf_num', type: 'number', value: 1 }], { my_num_as_integer: '42' }),
      [numberLink]
    );

    expect(outcome.mismatched).toBe(true);
    expect(outcome.conflicted).toBe(1);
    expect(outcome.changes).toEqual({
      customFields: [{ key: 'cf_num', type: 'number', value: 42 }],
    });
  });

  it('classifies duplicate customFields entries for one linked key as malformed (never array-order resolution)', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes(
        [
          { key: 'cf_text', type: 'text', value: 'first' },
          { key: 'cf_text', type: 'text', value: 'second' },
        ],
        null
      ),
      [textLink]
    );

    expect(outcome.changes).toBeUndefined();
    expect(outcome.diagnostics).toEqual([
      {
        category: 'duplicate_v1_entries',
        caseId: 'case-1',
        definitionId: 'def-1',
        legacyKey: 'cf_text',
      },
    ]);
  });

  it('diagnoses an undecodable v2 value instead of guessing', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes([], { my_num_as_integer: 'not-a-number' }),
      [numberLink]
    );

    expect(outcome.changes).toBeUndefined();
    expect(outcome.diagnostics).toEqual([
      expect.objectContaining({ category: 'undecodable_v2_value', legacyKey: 'cf_num' }),
    ]);
  });

  it('diagnoses a non-string v2 storage value', () => {
    const outcome = reconcileCaseFields('case-1', caseAttributes([], { my_num_as_integer: 42 }), [
      numberLink,
    ]);

    expect(outcome.changes).toBeUndefined();
    expect(outcome.diagnostics).toEqual([
      expect.objectContaining({ category: 'non_string_v2_value', legacyKey: 'cf_num' }),
    ]);
  });

  it('reconciles multiple links independently and never touches unlinked keys', () => {
    const outcome = reconcileCaseFields(
      'case-1',
      caseAttributes(
        [
          { key: 'cf_text', type: 'text', value: 'v1-only' },
          { key: 'unlinked_key', type: 'text', value: 'untouched' },
        ],
        { my_toggle_as_boolean: 'false', stray_key: 'untouched' }
      ),
      [textLink, toggleLink]
    );

    expect(outcome.changes).toEqual({
      customFields: [
        { key: 'cf_text', type: 'text', value: 'v1-only' },
        { key: 'unlinked_key', type: 'text', value: 'untouched' },
        { key: 'cf_toggle', type: 'toggle', value: false },
      ],
      extended_fields: {
        my_toggle_as_boolean: 'false',
        stray_key: 'untouched',
        my_text_as_keyword: 'v1-only',
      },
    });
  });
});

describe('runFieldValueReconciliationPhase', () => {
  let repo: {
    find: jest.Mock;
    get: jest.Mock;
    update: jest.Mock;
    bulkUpdate: jest.Mock;
    openPointInTimeForType: jest.Mock;
    closePointInTime: jest.Mock;
  };
  let logger: Logger;
  let signal: AbortSignal;

  const buildConfigureSO = (
    overrides: Partial<{
      id: string;
      owner: string;
      namespaces: string[];
      customFields: unknown[];
      legacyCasesMigrated: boolean;
      legacyFieldValuesReconciled: { at: string; linkFingerprint: string };
    }> = {}
  ) => ({
    id: overrides.id ?? 'config-1',
    type: CASE_CONFIGURE_SAVED_OBJECT,
    namespaces: overrides.namespaces ?? ['default'],
    references: [],
    version: 'config-version-1',
    attributes: {
      owner: overrides.owner ?? 'cases',
      customFields:
        overrides.customFields ??
        ([{ key: 'cf_text', type: 'text', label: 'My Text', required: false }] as unknown[]),
      legacyCasesMigrated: overrides.legacyCasesMigrated ?? true,
      legacyFieldValuesReconciled: overrides.legacyFieldValuesReconciled,
    },
  });

  const buildCaseSO = (
    id: string,
    customFields: Array<{ key: string; type: string; value: unknown }>,
    extendedFields?: Record<string, unknown> | null,
    sort: unknown[] = [1]
  ) => ({
    id,
    type: CASE_SAVED_OBJECT,
    references: [],
    version: `case-version-${id}`,
    attributes: { owner: 'cases', customFields, extended_fields: extendedFields ?? null },
    sort,
  });

  /** Routes find() by SO type; definitions and case pages are configurable. */
  const routeFinds = ({
    definitions = [makeDefinition()],
    casePages = [{ saved_objects: [], total: 0 }],
  }: {
    definitions?: FieldDefinition[];
    casePages?: unknown[];
  } = {}) => {
    let caseCall = 0;
    repo.find.mockImplementation((opts: { type: string }) => {
      if (opts.type === CASE_FIELD_DEFINITION_SAVED_OBJECT) {
        return Promise.resolve({
          saved_objects: definitions.map((attributes, i) => ({
            id: attributes.fieldDefinitionId,
            attributes,
            version: `def-version-${i}`,
          })),
          total: definitions.length,
        });
      }
      if (opts.type === CASE_SAVED_OBJECT) {
        const page = casePages[Math.min(caseCall, casePages.length - 1)];
        caseCall++;
        return Promise.resolve(page);
      }
      return Promise.resolve({ saved_objects: [], total: 0 });
    });
  };

  const run = (
    configures: unknown[],
    resumeCursor?: Parameters<typeof runFieldValueReconciliationPhase>[2]
  ) =>
    runFieldValueReconciliationPhase(
      repo as unknown as ISavedObjectsRepository,
      configures as Parameters<typeof runFieldValueReconciliationPhase>[1],
      resumeCursor,
      signal,
      'exec-1',
      logger
    );

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    signal = new AbortController().signal;
    repo = {
      find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
      get: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      bulkUpdate: jest.fn().mockResolvedValue({ saved_objects: [] }),
      openPointInTimeForType: jest.fn().mockResolvedValue({ id: 'pit-1' }),
      closePointInTime: jest.fn().mockResolvedValue({}),
    };
    // tryMarkSpaceReconciled re-fetches the configure SO fresh.
    repo.get.mockImplementation(() => Promise.resolve(buildConfigureSO()));
  });

  it('skips spaces without configured custom fields or an incomplete backfill', async () => {
    const noFields = buildConfigureSO({ id: 'no-fields', customFields: [] });
    const backfillPending = buildConfigureSO({
      id: 'backfill-pending',
      legacyCasesMigrated: false,
    });

    const result = await run([noFields, backfillPending]);

    expect(result.complete).toBe(true);
    expect(repo.find).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('writes the completion marker (with the fingerprint and version OCC) after a clean zero-mismatch scan', async () => {
    routeFinds({
      casePages: [
        {
          saved_objects: [
            buildCaseSO('case-1', [{ key: 'cf_text', type: 'text', value: 'same' }], {
              my_text_as_keyword: 'same',
            }),
          ],
          total: 1,
        },
      ],
    });

    const result = await run([buildConfigureSO()]);

    expect(result.complete).toBe(true);
    expect(result.counts.scanned).toBe(1);
    expect(result.counts.mismatched).toBe(0);
    expect(result.counts.completed).toBe(1);
    expect(repo.update).toHaveBeenCalledWith(
      CASE_CONFIGURE_SAVED_OBJECT,
      'config-1',
      {
        legacyFieldValuesReconciled: {
          at: expect.any(String),
          linkFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      },
      expect.objectContaining({ version: 'config-version-1', refresh: false })
    );
  });

  it('exits cheaply (no case scan) when the stored marker matches the current fingerprint', async () => {
    routeFinds();
    // First run a clean space to learn the real fingerprint.
    await run([buildConfigureSO()]);
    const marker = repo.update.mock.calls[0][2].legacyFieldValuesReconciled;
    repo.update.mockClear();
    repo.openPointInTimeForType.mockClear();

    const result = await run([buildConfigureSO({ legacyFieldValuesReconciled: marker })]);

    expect(result.complete).toBe(true);
    expect(repo.openPointInTimeForType).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rescans when the stored marker fingerprint is stale', async () => {
    routeFinds();

    const result = await run([
      buildConfigureSO({
        legacyFieldValuesReconciled: { at: '2024-01-01T00:00:00.000Z', linkFingerprint: 'stale' },
      }),
    ]);

    expect(repo.openPointInTimeForType).toHaveBeenCalled();
    expect(result.counts.completed).toBe(1);
  });

  it('submits version-aware repairs and requires a later pass to verify before marking', async () => {
    routeFinds({
      casePages: [
        {
          saved_objects: [
            buildCaseSO('case-1', [{ key: 'cf_text', type: 'text', value: 'from-v1' }], null),
          ],
          total: 1,
        },
      ],
    });

    const result = await run([buildConfigureSO()]);

    expect(repo.bulkUpdate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          type: CASE_SAVED_OBJECT,
          id: 'case-1',
          version: 'case-version-case-1',
          attributes: { extended_fields: { my_text_as_keyword: 'from-v1' } },
        }),
      ],
      { refresh: false }
    );
    expect(result.counts.repaired).toBe(1);
    expect(result.counts.mismatched).toBe(1);
    // Repaired — not verified yet; the phase is incomplete and no marker is written.
    expect(result.complete).toBe(false);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('never marks completion when the fresh fingerprint differs from the scanned one (A3 OCC)', async () => {
    // The initial analysis sees a linked definition; the fresh re-analysis
    // during completion sees none (a concurrent configure/definition change).
    let defCall = 0;
    repo.find.mockImplementation((opts: { type: string }) => {
      if (opts.type === CASE_FIELD_DEFINITION_SAVED_OBJECT) {
        defCall++;
        return Promise.resolve(
          defCall === 1
            ? {
                saved_objects: [{ id: 'def-1', attributes: makeDefinition(), version: 'v1' }],
                total: 1,
              }
            : { saved_objects: [], total: 0 }
        );
      }
      if (opts.type === CASE_SAVED_OBJECT) {
        return Promise.resolve({ saved_objects: [], total: 0 });
      }
      return Promise.resolve({ saved_objects: [], total: 0 });
    });

    const result = await run([buildConfigureSO()]);

    expect(repo.update).not.toHaveBeenCalled();
    expect(result.counts.completed).toBe(0);
    // A stale space is not terminal — the phase reports incomplete so it retries.
    expect(result.complete).toBe(false);
  });

  it('blocks completion (with content-free diagnostics) when a configured field is unresolved', async () => {
    routeFinds({ definitions: [] });

    const result = await run([buildConfigureSO()]);

    expect(result.complete).toBe(true); // blocked is terminal for the run (interval retries)
    expect(result.counts.malformed).toBe(1);
    expect(repo.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('category="unresolved_configured_field"')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('legacyKey="cf_text"'));
  });

  it('blocks completion when a scanned case has permanently malformed data', async () => {
    routeFinds({
      casePages: [
        {
          saved_objects: [
            buildCaseSO(
              'case-1',
              [
                { key: 'cf_text', type: 'text', value: 'a' },
                { key: 'cf_text', type: 'text', value: 'b' },
              ],
              null
            ),
          ],
          total: 1,
        },
      ],
    });

    const result = await run([buildConfigureSO()]);

    expect(result.counts.malformed).toBe(1);
    expect(repo.update).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('category="duplicate_v1_entries"')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('caseId="case-1"'));
  });

  it('treats update conflicts as retryable failures (space restarts fresh later)', async () => {
    routeFinds({
      casePages: [
        {
          saved_objects: [
            buildCaseSO('case-1', [{ key: 'cf_text', type: 'text', value: 'v' }], null),
          ],
          total: 1,
        },
      ],
    });
    repo.bulkUpdate.mockResolvedValue({
      saved_objects: [
        { id: 'case-1', type: CASE_SAVED_OBJECT, error: { statusCode: 409, message: 'conflict' } },
      ],
    });

    const result = await run([buildConfigureSO()]);

    expect(result.hadFailures).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.counts.repaired).toBe(0);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('skips 404s without failing the space', async () => {
    routeFinds({
      casePages: [
        {
          saved_objects: [
            buildCaseSO('case-1', [{ key: 'cf_text', type: 'text', value: 'v' }], null),
          ],
          total: 1,
        },
      ],
    });
    repo.bulkUpdate.mockResolvedValue({
      saved_objects: [
        { id: 'case-1', type: CASE_SAVED_OBJECT, error: { statusCode: 404, message: 'gone' } },
      ],
    });

    const result = await run([buildConfigureSO()]);

    expect(result.hadFailures).toBe(false);
    // The repair was submitted (mismatch found) so the pass is not a verification.
    expect(result.complete).toBe(false);
  });

  it('pauses with a fingerprint-stamped cursor when the scan budget is exhausted', async () => {
    const fullPage = {
      saved_objects: Array.from({ length: 1000 }, (_, i) =>
        buildCaseSO(`case-${i}`, [], null, [i])
      ),
      total: 1000,
      pit_id: 'pit-1',
    };
    routeFinds({ casePages: [fullPage] });

    const result = await run([buildConfigureSO()]);

    expect(result.complete).toBe(false);
    expect(result.nextCursor).toEqual(
      expect.objectContaining({
        configureId: 'config-1',
        pitId: 'pit-1',
        linkFingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
      })
    );
  });

  it('restarts from a fresh snapshot when a resumed cursor has a stale fingerprint', async () => {
    routeFinds();

    await run([buildConfigureSO()], {
      configureId: 'config-1',
      owner: 'cases',
      namespace: 'default',
      pitId: 'stale-pit',
      searchAfter: [42],
      linkFingerprint: 'stale-fingerprint',
    });

    // The stale PIT is closed and a fresh one opened; the search does not resume.
    expect(repo.closePointInTime).toHaveBeenCalledWith('stale-pit');
    expect(repo.openPointInTimeForType).toHaveBeenCalled();
    const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
    expect(caseFind?.[0].searchAfter).toBeUndefined();
  });

  it('leaves inactive historical links untouched', async () => {
    // A definition linked to a key that is no longer configured: its stray v2
    // storage key must not be re-populated into v1.
    routeFinds({
      definitions: [
        makeDefinition(),
        makeDefinition({
          fieldDefinitionId: 'def-old',
          name: 'old_field',
          legacyKey: 'removed_key',
          definition: 'name: old_field\nlabel: Old\ntype: keyword\ncontrol: INPUT_TEXT\n',
        }),
      ],
      casePages: [
        {
          saved_objects: [
            buildCaseSO('case-1', [{ key: 'cf_text', type: 'text', value: 'same' }], {
              my_text_as_keyword: 'same',
              old_field_as_keyword: 'historical',
            }),
          ],
          total: 1,
        },
      ],
    });
    // Fresh completion re-analysis must see the same two definitions.
    repo.get.mockResolvedValue(buildConfigureSO());

    const result = await run([buildConfigureSO()]);

    expect(repo.bulkUpdate).not.toHaveBeenCalled();
    expect(result.counts.completed).toBe(1);
  });

  it('scopes definition and case queries to the space namespace', async () => {
    routeFinds();
    repo.get.mockResolvedValue(buildConfigureSO({ namespaces: ['my-space'] }));

    await run([buildConfigureSO({ namespaces: ['my-space'] })]);

    const defFind = repo.find.mock.calls.find(
      (c) => c[0]?.type === CASE_FIELD_DEFINITION_SAVED_OBJECT
    );
    expect(defFind?.[0].namespaces).toEqual(['my-space']);
    expect(repo.openPointInTimeForType).toHaveBeenCalledWith(
      CASE_SAVED_OBJECT,
      expect.objectContaining({ namespaces: ['my-space'] })
    );
    const caseFind = repo.find.mock.calls.find((c) => c[0]?.type === CASE_SAVED_OBJECT);
    expect(caseFind?.[0].namespaces).toEqual(['my-space']);
  });
});
