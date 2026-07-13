/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Covers the pack-upload path in `queries_field.tsx` (`handlePackUpload`):
 *  - CREATE mode adopts the file's name/description/schedule and forces the
 *    imported pack disabled;
 *  - EDIT mode preserves the existing pack's enabled/name/description/schedule;
 *  - per-query numeric/boolean fields (interval/timeout/snapshot/removed) and
 *    ecs_mapping survive the import keep-predicate.
 *
 * A dedicated round-trip test (bottom of file) wires the REAL serializer
 * (`serializePack`) and the REAL uploader reviver (`OsqueryPackUploader`, driven
 * through a genuine File + FileReader — NOT re-implemented) into the REAL import
 * handler, and asserts the exported→imported pack is functionally equivalent.
 */

import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import { serializePack } from './pack_serializer';

// ---------------------------------------------------------------------------
// Stubs for heavy child components
// ---------------------------------------------------------------------------

jest.mock('../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          osquery: {
            writeSavedQueries: true,
            readSavedQueries: true,
            writeLiveQueries: true,
            runSavedQueries: true,
          },
        },
      },
    },
  }),
}));

// QueriesField transitively pulls in QueryFlyout / PackQueriesTable via lazy
// children — stub them out so we only render the uploader + field-array shell.
jest.mock('../queries/query_flyout', () => ({
  QueryFlyout: () => <div data-test-subj="query-flyout-stub" />,
}));

jest.mock('../pack_queries_table', () => ({
  PackQueriesTable: () => <div data-test-subj="pack-queries-table">Table</div>,
}));

// Capture the onChange callback from OsqueryPackUploader so we can trigger
// an upload from the test without filesystem interaction. The real uploader
// (and its reviver) is exercised separately in the round-trip test via
// `jest.requireActual`.
let capturedUploaderOnChange: ((content: Record<string, unknown>, name: string) => void) | null =
  null;

jest.mock('./pack_uploader', () => ({
  OsqueryPackUploader: ({
    onChange,
  }: {
    onChange: (content: Record<string, unknown>, name: string) => void;
  }) => {
    capturedUploaderOnChange = onChange;

    return <div data-test-subj="osquery-pack-uploader">Upload</div>;
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { QueriesField } from './queries_field';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...allowedExperimentalValues, rruleScheduling: false },
  });
});

// Probe that surfaces the live `queries` form-array state out of the provider
// so the test can assert what the uploader actually wrote into RHF — not the
// input literal it was handed.
interface UploadedQueryState {
  id?: string;
  interval?: string | number;
  timeout?: number;
  snapshot?: boolean;
  removed?: boolean;
  query?: string;
  ecs_mapping?: Record<string, unknown>;
}
let capturedQueriesState: UploadedQueryState[] = [];
let capturedPackState: {
  name?: string;
  description?: string;
  enabled?: boolean;
  schedule?: { scheduleType?: string; interval?: number } & Record<string, unknown>;
} = {};
const FormStateProbe: React.FC = () => {
  const queries = useWatch({ name: 'queries' }) as UploadedQueryState[] | undefined;
  const name = useWatch({ name: 'name' }) as string | undefined;
  const description = useWatch({ name: 'description' }) as string | undefined;
  const enabled = useWatch({ name: 'enabled' }) as boolean | undefined;
  const schedule = useWatch({ name: 'schedule' }) as
    | ({ scheduleType?: string; interval?: number } & Record<string, unknown>)
    | undefined;
  capturedQueriesState = queries ?? [];
  capturedPackState = { name, description, enabled, schedule };

  return null;
};

interface FormWrapperProps {
  children: React.ReactNode;
  defaultValues?: Record<string, unknown>;
}

// Wrapper that provides FormProvider with a fresh useForm instance matching
// the shape QueriesField reads via useWatch(). `defaultValues` lets an EDIT-mode
// test seed the form as if an existing pack were being edited.
const FormWrapper: React.FC<FormWrapperProps> = ({ children, defaultValues }) => {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: {
      name: '',
      description: '',
      enabled: true,
      queries: [],
      schedule_type: undefined,
      interval: undefined,
      rrule_schedule: undefined,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      {children}
      <FormStateProbe />
    </FormProvider>
  );
};

const renderQueriesField = (
  { editMode = false }: { editMode?: boolean } = {},
  defaultValues?: Record<string, unknown>
) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <FormWrapper defaultValues={defaultValues}>
          <QueriesField euiFieldProps={{}} editMode={editMode} />
        </FormWrapper>
      </IntlProvider>
    </EuiProvider>
  );

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

describe('QueriesField', () => {
  beforeEach(() => {
    capturedUploaderOnChange = null;
    capturedQueriesState = [];
    capturedPackState = {};
    jest.clearAllMocks();
  });

  describe('handlePackUpload — per-query fields', () => {
    it('should inject interval onto each uploaded query, using the 3600 fallback when the file omits it', () => {
      // The uploader callback (handlePackUpload in queries_field.tsx) maps
      //   `interval: newQuery.interval ?? parsedContent.interval ?? '3600'`
      // onto each query and writes the result into the `queries` form array.
      // This asserts the RESULTING RHF state after upload (not the input
      // literal), so it fails if the uploader stops injecting interval.
      renderQueriesField();

      expect(capturedUploaderOnChange).not.toBeNull();

      act(() => {
        capturedUploaderOnChange!(
          {
            queries: {
              'uptime-check': { query: 'select * from uptime;', interval: '120' },
              'fallback-query': { query: 'select 1;' },
            },
          },
          'test-pack'
        );
      });

      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(capturedQueriesState).toHaveLength(2);

      // Explicit interval is carried through to form state verbatim.
      expect(byId['uptime-check'].interval).toBe('120');

      // No per-query / pack-level interval → the uploader's '3600' fallback is
      // injected. This is the assertion that fails if the uploader stops
      // injecting interval (the regression we're guarding).
      expect(byId['fallback-query'].interval).toBe('3600');

      // Both uploaded queries preserved their SQL — confirms the array was
      // populated from the uploaded content, not left empty.
      expect(byId['uptime-check'].query).toBe('select * from uptime;');
      expect(byId['fallback-query'].query).toBe('select 1;');
    });

    it('should preserve numeric timeout and boolean snapshot/removed (keep-predicate no longer drops them)', () => {
      // The keep-predicate is `v !== undefined && v !== null && v !== ''`, so
      // numeric `timeout` and booleans `snapshot`/`removed` (incl. `true`) now
      // survive. `snapshot: false` also survives.
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          {
            queries: {
              a: {
                query: 'select 1;',
                interval: '60',
                timeout: 120,
                snapshot: true,
                removed: true,
              },
              b: {
                query: 'select 2;',
                interval: '60',
                snapshot: false,
              },
            },
          },
          'test-pack'
        );
      });

      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(byId.a).toMatchObject({ timeout: 120, snapshot: true, removed: true });
      // `snapshot: false` is a specified value and must survive (it is not
      // undefined/null/'').
      expect(byId.b.snapshot).toBe(false);
    });

    it('should preserve per-query ecs_mapping on import', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          {
            queries: {
              proc: {
                query: 'select * from processes;',
                interval: '60',
                ecs_mapping: { 'process.pid': { field: 'pid' } },
              },
            },
          },
          'test-pack'
        );
      });

      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(byId.proc.ecs_mapping).toEqual({ 'process.pid': { field: 'pid' } });
    });

    it('should fall back to a top-level ecs_mapping when a query has none', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          {
            ecs_mapping: { 'host.name': { field: 'hostname' } },
            queries: { q: { query: 'select 1;', interval: '60' } },
          },
          'test-pack'
        );
      });

      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(byId.q.ecs_mapping).toEqual({ 'host.name': { field: 'hostname' } });
    });

    it('should leave queries without ecs_mapping untouched', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          { queries: { q: { query: 'select 1;', interval: '60' } } },
          'test-pack'
        );
      });

      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(byId.q).not.toHaveProperty('ecs_mapping');
    });
  });

  describe('handlePackUpload — CREATE mode', () => {
    it('should use the in-file pack name over the filename (1:1 across clusters)', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          { name: 'forensics-pack', queries: { q: { query: 'select 1;', interval: '60' } } },
          'renamed-file'
        );
      });

      expect(capturedPackState.name).toBe('forensics-pack');
    });

    it('should fall back to the filename when the file has no name (community .conf)', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          { queries: { q: { query: 'select 1;', interval: '60' } } },
          'from-filename'
        );
      });

      expect(capturedPackState.name).toBe('from-filename');
    });

    it('should import the pack description', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'p',
            description: 'imported description',
            queries: { q: { query: 'select 1;', interval: '60' } },
          },
          'file'
        );
      });

      expect(capturedPackState.description).toBe('imported description');
    });

    it('should land the imported pack disabled regardless of any enabled in the file', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'p',
            enabled: true,
            queries: { q: { query: 'select 1;', interval: '60' } },
          },
          'file'
        );
      });

      expect(capturedPackState.enabled).toBe(false);
    });

    it('should restore a pack-level rrule schedule from the file when present', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'p',
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-07-07T00:00:00.000Z' },
            queries: { q: { query: 'select 1;', interval: '60' } },
          },
          'file'
        );
      });

      expect(capturedPackState.schedule?.scheduleType).toBe('rrule');
    });

    it('should not set a schedule when the file has no pack-level schedule', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!(
          { name: 'p', queries: { q: { query: 'select 1;', interval: '60' } } },
          'file'
        );
      });

      // Left at the form default (undefined here) — import did not touch it.
      expect(capturedPackState.schedule).toBeUndefined();
    });
  });

  describe('handlePackUpload — EDIT mode', () => {
    // Seed the form as if an existing pack were being edited. An upload in EDIT
    // mode must import only the queries and NOT clobber the existing pack's
    // name/description/enabled/schedule.
    const existingPackDefaults = {
      name: 'existing-pack',
      description: 'existing description',
      enabled: true,
      queries: [{ id: 'existing-query', query: 'select existing;', interval: '900' }],
      schedule: { scheduleType: 'interval', interval: 900 },
    };

    it('should preserve the existing enabled flag (does not force disabled)', () => {
      renderQueriesField({ editMode: true }, existingPackDefaults);

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'file-pack',
            enabled: true,
            queries: { imported: { query: 'select imported;', interval: '60' } },
          },
          'file'
        );
      });

      // CREATE would force `enabled: false`; EDIT must leave the seeded `true`.
      expect(capturedPackState.enabled).toBe(true);
    });

    it('should preserve the existing pack name (does not overwrite from the file)', () => {
      renderQueriesField({ editMode: true }, existingPackDefaults);

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'file-pack',
            queries: { imported: { query: 'select imported;', interval: '60' } },
          },
          'file'
        );
      });

      expect(capturedPackState.name).toBe('existing-pack');
    });

    it('should preserve the existing description (does not overwrite from the file)', () => {
      renderQueriesField({ editMode: true }, existingPackDefaults);

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'file-pack',
            description: 'file description',
            queries: { imported: { query: 'select imported;', interval: '60' } },
          },
          'file'
        );
      });

      expect(capturedPackState.description).toBe('existing description');
    });

    it('should preserve the existing schedule (does not overwrite from the file)', () => {
      renderQueriesField({ editMode: true }, existingPackDefaults);

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'file-pack',
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-07-07T00:00:00.000Z' },
            queries: { imported: { query: 'select imported;', interval: '60' } },
          },
          'file'
        );
      });

      // Seeded interval schedule is untouched — the file's rrule schedule is
      // ignored in EDIT mode.
      expect(capturedPackState.schedule?.scheduleType).toBe('interval');
    });

    it('should still replace the query array with the imported queries', () => {
      renderQueriesField({ editMode: true }, existingPackDefaults);

      act(() => {
        capturedUploaderOnChange!(
          {
            name: 'file-pack',
            queries: { imported: { query: 'select imported;', interval: '60' } },
          },
          'file'
        );
      });

      const ids = capturedQueriesState.map((q) => q.id);
      expect(ids).toEqual(['imported']);
    });
  });

  describe('handlePackUpload — legacy plain pack (no metadata)', () => {
    // AC#6 regression: a legacy .conf-style pack with NO name/description/
    // schedule/ecs_mapping must still import cleanly.
    const legacyContent = {
      queries: {
        legacy_query: { query: 'select * from processes;', interval: '30' },
      },
    };

    it('should derive the name from the filename in CREATE mode', () => {
      renderQueriesField();

      act(() => {
        capturedUploaderOnChange!({ ...legacyContent }, 'osquery-community');
      });

      expect(capturedPackState.name).toBe('osquery-community');
      expect(capturedPackState.enabled).toBe(false);
      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(byId.legacy_query.query).toBe('select * from processes;');
      expect(byId.legacy_query.interval).toBe('30');
    });

    it('should leave the existing enabled flag untouched in EDIT mode', () => {
      renderQueriesField(
        { editMode: true },
        {
          name: 'existing-pack',
          enabled: true,
          queries: [{ id: 'existing-query', query: 'select existing;', interval: '900' }],
        }
      );

      act(() => {
        capturedUploaderOnChange!({ ...legacyContent }, 'osquery-community');
      });

      expect(capturedPackState.enabled).toBe(true);
      expect(capturedPackState.name).toBe('existing-pack');
      const ids = capturedQueriesState.map((q) => q.id);
      expect(ids).toEqual(['legacy_query']);
    });
  });

  describe('export → import round-trip (real serializer + real reviver + real importer)', () => {
    // The real uploader (and its JSON reviver) — NOT the mocked stub. Driving
    // this through a genuine File + FileReader exercises the actual parse path
    // (whitespace-preserving reviver + interval stringification) end to end.
    const { OsqueryPackUploader: RealUploader } = jest.requireActual('./pack_uploader');

    // Run the exported JSON through the real uploader reviver by uploading it as
    // a File and capturing what `onChange` receives.
    const parseWithRealReviver = async (
      exportedJson: string,
      fileName: string
    ): Promise<{ content: Record<string, unknown>; name: string }> => {
      let received: { content: Record<string, unknown>; name: string } | null = null;
      const onChange = (content: Record<string, unknown>, name: string) => {
        received = { content, name };
      };

      const { container } = render(
        <EuiProvider>
          <IntlProvider locale="en">
            <RealUploader onChange={onChange} />
          </IntlProvider>
        </EuiProvider>
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File([exportedJson], fileName, { type: 'application/json' });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(received).not.toBeNull();
      });

      return received!;
    };

    it('should preserve name, description, verbatim query text, ecs_mapping, per-query numeric/boolean fields, and interval schedule', async () => {
      // Realistic public-API pack fixture (array `queries`, name in `id`,
      // ecs_mapping as `{ key, value }` array) — the exact shape the Packs table
      // holds. Query text intentionally contains multiple internal spaces to
      // prove the reviver preserves whitespace verbatim now.
      const apiPack = {
        saved_object_id: 'so-id-1',
        name: 'forensics-pack',
        description: 'A realistic forensics pack',
        enabled: true,
        policy_ids: ['policy-1'],
        shards: [],
        schedule_type: 'interval',
        interval: 900,
        queries: [
          {
            id: 'processes_elastic',
            query: 'SELECT  *   FROM processes WHERE  pid > 0;',
            interval: 60,
            timeout: 120,
            snapshot: false,
            removed: true,
            platform: 'linux',
            ecs_mapping: [{ key: 'process.pid', value: { field: 'pid' } }],
          },
          {
            id: 'listening_ports',
            query: 'SELECT * FROM listening_ports;',
            interval: 30,
          },
        ],
      } as never;

      // 1) Serialize with the REAL serializer, 2) JSON stringify.
      const exported = serializePack(apiPack);
      const json = JSON.stringify(exported, null, 2);

      // 3) Parse through the REAL uploader reviver (File + FileReader).
      const { content, name } = await parseWithRealReviver(json, 'forensics-pack.json');

      // 4) Feed the parsed content through the REAL import handler in CREATE
      //    mode (renders QueriesField → handlePackUpload).
      renderQueriesField();
      act(() => {
        capturedUploaderOnChange!(content, name);
      });

      // --- Functional equivalence assertions ---

      // Pack metadata.
      expect(capturedPackState.name).toBe('forensics-pack');
      expect(capturedPackState.description).toBe('A realistic forensics pack');
      // Imported packs always land disabled.
      expect(capturedPackState.enabled).toBe(false);
      // Interval pack-level schedule survives the reviver's interval
      // stringification (deserializeSchedule Number()-coerces it).
      expect(capturedPackState.schedule?.scheduleType).toBe('interval');
      expect(capturedPackState.schedule?.interval).toBe(900);

      // Queries.
      const byId = Object.fromEntries(capturedQueriesState.map((q) => [q.id, q]));
      expect(Object.keys(byId).sort()).toEqual(['listening_ports', 'processes_elastic']);

      // Query text is preserved VERBATIM (multi-space SQL survives).
      expect(byId.processes_elastic.query).toBe('SELECT  *   FROM processes WHERE  pid > 0;');
      expect(byId.listening_ports.query).toBe('SELECT * FROM listening_ports;');

      // Per-query numeric/boolean fields survive. Intervals are stringified by
      // the reviver (form stores them as strings).
      expect(byId.processes_elastic.interval).toBe('60');
      expect(byId.processes_elastic.timeout).toBe(120);
      expect(byId.processes_elastic.snapshot).toBe(false);
      expect(byId.processes_elastic.removed).toBe(true);
      expect(byId.listening_ports.interval).toBe('30');

      // ecs_mapping round-trips to the osquery object form.
      expect(byId.processes_elastic.ecs_mapping).toEqual({ 'process.pid': { field: 'pid' } });
    });
  });
});
