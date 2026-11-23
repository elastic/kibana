/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { LibraryDisabledError, LibraryFetchError, LibraryNotFoundError } from './errors';
export type { LibraryFetchErrorReason } from './errors';

export { LibraryFetcher } from './library_fetcher';
export type { LibraryFetcherDeps, LibraryFetcherRetryOptions } from './library_fetcher';

export { LibraryBundleReader } from './library_bundle_reader';
export type { LibraryBundleReaderDeps } from './library_bundle_reader';

export type { LibrarySource } from './library_source';

export type {
  LibraryFailure,
  LibraryFailureListener,
  LibraryHealth,
  LibraryOperation,
  LibrarySourceMode,
} from './library_cache';

export { LibraryService } from './library_service';
export type { TemplateFilters } from './library_service';

export { resolveTemplateOrigin } from './resolve_template_origin';
export type { ResolveTemplateOriginParams } from './resolve_template_origin';

export { classifyLibraryError } from './classify_library_error';
export type { ClassifiedLibraryError, LibraryErrorType } from './classify_library_error';

export {
  LibraryTelemetry,
  registerLibraryEventTypes,
  registerLibraryUsageCollector,
} from './telemetry';
export type { TemplateInstallDetails, TemplateInstallSource } from './telemetry';
