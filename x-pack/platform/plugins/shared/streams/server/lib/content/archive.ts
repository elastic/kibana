/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import { DeepStrict } from '@kbn/zod-helpers/v4';
import type {
  ContentPack,
  ContentPackDashboard,
  ContentPackEntry,
  ContentPackManifest,
  ContentPackSavedObject,
  ContentPackStream,
  ContentPackStreamRequest,
} from '@kbn/content-packs-schema';
import {
  SUPPORTED_ENTRY_TYPE,
  SUPPORTED_SAVED_OBJECT_TYPE,
  contentPackManifestSchema,
  getEntryTypeByFile,
  isSupportedEntryType,
  isSupportedFile,
  isSupportedReferenceType,
} from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import AdmZip from 'adm-zip';
import path from 'path';
import type { Readable } from 'stream';
import { compact, pick, uniqBy } from 'lodash';
import { InvalidContentPackError } from './error';

const ARCHIVE_ENTRY_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per entry
const ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB across all entries
const ARCHIVE_MAX_ENTRIES = 500;

// Strict wired upsert schema: `DeepStrict` over the wired upsert shape (equivalent to
// `Streams.WiredStream.UpsertRequest.is`), applied so the parsed request can be `safeParse`d
// without a type assertion.
const wiredUpsertRequestSchema = DeepStrict(Streams.WiredStream.UpsertRequest.right);

/**
 * Content-pack stream entries match the wired stream upsert request. Significant-event
 * queries are not part of content packs (they are managed via the dedicated
 * `/api/streams/{name}/queries` endpoints), so this guard validates the strict wired upsert
 * shape. `extractEntries` calls `rejectStreamQueries` first, so any entry that still carries a
 * `queries` field is rejected upfront and this guard only ever sees a queries-free request.
 */
export function isContentPackStreamRequest(value: unknown): value is ContentPackStreamRequest {
  return wiredUpsertRequestSchema.safeParse(value).success;
}

/**
 * Significant-event queries are not part of content packs; they are managed via the dedicated
 * `/api/streams/{name}/queries` endpoints. Content packs are tech preview, so rather than
 * half-supporting a legacy shape we reject any stream entry that carries a `queries` field at
 * all (including an empty `queries: []`) so detections are never silently dropped on import.
 */
export function rejectStreamQueries(
  streamName: string | undefined,
  entryName: string,
  request: Record<string, unknown>
): void {
  if (request.queries !== undefined) {
    throw new InvalidContentPackError(
      `Stream [${streamName}] in entry [${entryName}] contains significant-event queries, which are not supported by content packs. Manage them via the /api/streams/{name}/queries endpoints.`
    );
  }
}

/**
 * Rejects decompression bombs at the zip metadata stage, before any entry is inflated. Bounds
 * both the number of entries and the sum of their declared uncompressed sizes. This is a sound
 * upper bound because `readEntry` decompresses synchronously and enforces the per-entry declared
 * size (see the note there), so an entry's actual bytes never exceed its declared `header.size`.
 * The caps apply to every zip entry, not only supported ones, so an archive padded with junk is
 * rejected too.
 */
export function assertArchiveWithinLimits(entries: AdmZip.IZipEntry[]): void {
  if (entries.length > ARCHIVE_MAX_ENTRIES) {
    throw new InvalidContentPackError(
      `Content pack has too many entries (max ${ARCHIVE_MAX_ENTRIES})`
    );
  }

  const totalUncompressedSize = entries.reduce((sum, entry) => sum + entry.header.size, 0);
  if (totalUncompressedSize > ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES) {
    throw new InvalidContentPackError(
      `Content pack exceeds the maximum total uncompressed size of ${ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES} bytes`
    );
  }
}

export async function parseArchive(archive: Readable): Promise<ContentPack> {
  const zip: AdmZip = await new Promise((resolve, reject) => {
    const bufs: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => bufs.push(chunk));
    archive.on('end', () => {
      try {
        resolve(new AdmZip(Buffer.concat(bufs)));
      } catch (err) {
        reject(new InvalidContentPackError('Invalid content pack format'));
      }
    });
    archive.on('error', (error) => reject(error));
  });

  const zipEntries = zip.getEntries();
  assertArchiveWithinLimits(zipEntries);

  const budget = new DecompressionBudget(ARCHIVE_MAX_TOTAL_UNCOMPRESSED_BYTES);
  const rootDir = getRootDir(zipEntries);
  // @ts-expect-error upgrade typescript v5.9.3
  const manifest = extractManifest(rootDir, zip, budget);
  // @ts-expect-error upgrade typescript v5.9.3
  const entries = extractEntries(rootDir, zip, budget);

  return { ...manifest, entries };
}

/**
 * Tracks the running total of actually-decompressed bytes across every `readEntry` call for a single
 * archive and rejects once it exceeds the cap. `assertArchiveWithinLimits` bounds the sum of the
 * DISTINCT entry sizes, but a dashboard can reference the same saved object and `resolveDashboard`
 * materializes referenced entries once per dashboard. A pack with a few large shared references
 * fanned out across many dashboards stays within the metadata caps yet expands to gigabytes when
 * materialized. This runtime budget closes that path (and any other repeated-read path) by bounding
 * the total materialized bytes rather than only the distinct declared bytes.
 */
export class DecompressionBudget {
  private used = 0;

  constructor(private readonly max: number) {}

  account(bytes: number): void {
    this.used += bytes;
    if (this.used > this.max) {
      throw new InvalidContentPackError(
        `Content pack exceeds the maximum total uncompressed size of ${this.max} bytes`
      );
    }
  }
}

export async function generateArchive(manifest: ContentPackManifest, objects: ContentPackEntry[]) {
  const zip = new AdmZip();
  const rootDir = `${manifest.name}-${manifest.version}`;

  objects
    .filter((object) => isSupportedEntryType(object.type))
    .forEach((object: ContentPackEntry) => {
      const type = object.type;
      switch (type) {
        case 'dashboard':
        case 'index-pattern':
        case 'lens': {
          const subDir = SUPPORTED_SAVED_OBJECT_TYPE[object.type];
          zip.addFile(
            path.join(rootDir, 'kibana', subDir, `${object.id}.json`),
            Buffer.from(JSON.stringify(object, null, 2))
          );
          return;
        }

        case 'stream': {
          const subDir = SUPPORTED_ENTRY_TYPE.stream;
          zip.addFile(
            path.join(rootDir, subDir, `${object.name}.json`),
            Buffer.from(JSON.stringify({ name: object.name, request: object.request }, null, 2))
          );
          return;
        }

        default:
          missingEntryTypeImpl(type);
      }
    });

  zip.addFile(
    path.join(rootDir, 'manifest.yml'),
    Buffer.from(YAML.stringify(pick(manifest, ['name', 'description', 'version'])))
  );

  return zip.toBufferPromise();
}

/**
 * Decompresses a single entry synchronously. The sync path routes through zlib's `inflateRawSync`,
 * which honors `maxOutputLength = header.size` and throws `ERR_BUFFER_TOO_LARGE` when the deflate
 * stream inflates past the declared size. The async `getDataAsync` (streaming `createInflateRaw`)
 * does NOT enforce that cap, so a lying entry (tiny declared size, huge deflate stream) would
 * inflate without bound. Combined with `assertUncompressedSize` rejecting any entry declaring more
 * than 1MB, this guarantees actual bytes per entry never exceed 1MB and surfaces a 400 instead of
 * a raw zlib crash.
 */
function readEntry(entry: AdmZip.IZipEntry, budget: DecompressionBudget): Buffer {
  let data: Buffer;
  try {
    data = entry.getData();
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ERR_BUFFER_TOO_LARGE') {
      throw new InvalidContentPackError(
        `Object [${entry.entryName}] exceeds the limit of ${ARCHIVE_ENTRY_MAX_SIZE_BYTES} bytes`
      );
    }
    throw err;
  }

  // Accounts for every read, so repeated reads of the same referenced entry (dashboard fan-out)
  // count against the budget too.
  budget.account(data.length);
  return data;
}

function extractManifest(
  rootDir: string,
  zip: AdmZip,
  budget: DecompressionBudget
): ContentPackManifest {
  const manifestPath = `${rootDir}/manifest.yml`;
  const entry = zip.getEntry(manifestPath);
  if (!entry) {
    throw new InvalidContentPackError(`Expected manifest at [${manifestPath}]`);
  }

  assertUncompressedSize(entry);

  const { data: manifest, success } = contentPackManifestSchema.safeParse(
    YAML.parse(readEntry(entry, budget).toString())
  );
  if (!success) {
    throw new InvalidContentPackError('Invalid content pack manifest format');
  }

  return manifest;
}

function extractEntries(
  rootDir: string,
  zip: AdmZip,
  budget: DecompressionBudget
): ContentPackEntry[] {
  const supportedEntries = zip
    .getEntries()
    .filter((entry) => isSupportedFile(rootDir, entry.entryName));

  supportedEntries.forEach((entry) => assertUncompressedSize(entry));

  const entries: ContentPackEntry[] = [];
  for (const entry of supportedEntries) {
    const type = getEntryTypeByFile(rootDir, entry.entryName);
    switch (type) {
      case 'lens':
      case 'index-pattern':
        // these are handled by their parent dashboard
        break;

      case 'dashboard':
        entries.push(...resolveDashboard(rootDir, zip, entry, budget));
        break;

      case 'stream': {
        const parsed = JSON.parse(readEntry(entry, budget).toString()) as {
          name?: string;
          request?: Record<string, unknown>;
        };
        const requestObject =
          parsed.request && typeof parsed.request === 'object' && !Array.isArray(parsed.request)
            ? parsed.request
            : undefined;

        if (requestObject) {
          rejectStreamQueries(parsed.name, entry.entryName, requestObject);
        }

        const request = parsed.request;
        if (!parsed.name || !isContentPackStreamRequest(request)) {
          throw new InvalidContentPackError(
            `Invalid stream definition in entry [${entry.entryName}]`
          );
        }

        const streamEntry: ContentPackStream = {
          type: 'stream',
          name: parsed.name,
          request,
        };
        entries.push(streamEntry);
        break;
      }

      default:
        missingEntryTypeImpl(type);
    }
  }

  return entries;
}

function resolveDashboard(
  rootDir: string,
  zip: AdmZip,
  dashboardEntry: AdmZip.IZipEntry,
  budget: DecompressionBudget
): ContentPackSavedObject[] {
  const dashboard = JSON.parse(
    readEntry(dashboardEntry, budget).toString()
  ) as ContentPackDashboard;

  const uniqReferences = uniqBy(dashboard.references, (ref) => ref.id);
  if (uniqReferences.some(({ type }) => !isSupportedReferenceType(type))) {
    throw new InvalidContentPackError(
      `Dashboard [${
        dashboard.id
      }] references saved object types not supported by content packs: ${uniqReferences.filter(
        ({ type }) => !isSupportedReferenceType(type)
      )}`
    );
  }

  const includedReferences = compact(
    (uniqReferences as Array<{ type: ContentPackSavedObject['type']; id: string }>).map((ref) =>
      zip.getEntry(
        path.join(rootDir, 'kibana', SUPPORTED_SAVED_OBJECT_TYPE[ref.type], `${ref.id}.json`)
      )
    )
  );

  const resolvedReferences = includedReferences.map(
    (entry) => JSON.parse(readEntry(entry, budget).toString()) as ContentPackSavedObject
  );

  return [dashboard, ...resolvedReferences];
}

function getRootDir(entries: AdmZip.IZipEntry[]) {
  const rootDirs = new Set<string>();
  for (const entry of entries) {
    const rootDir = entry.entryName.split(path.sep)[0];
    rootDirs.add(rootDir);
  }

  if (rootDirs.size !== 1) {
    throw new InvalidContentPackError(
      `Expected a single root directory but got [${Array.from(rootDirs)}]`
    );
  }

  return rootDirs.keys().next().value;
}

function assertUncompressedSize(entry: AdmZip.IZipEntry) {
  if (entry.header.size > ARCHIVE_ENTRY_MAX_SIZE_BYTES) {
    throw new InvalidContentPackError(
      `Object [${entry.entryName}] exceeds the limit of ${ARCHIVE_ENTRY_MAX_SIZE_BYTES} bytes`
    );
  }
}

function missingEntryTypeImpl(type: never): never {
  throw new Error(`Content pack entry type [${type}] is not implemented`);
}
