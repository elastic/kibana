/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import * as rt from 'io-ts';
import { FileAttachmentMetadataRt } from '../../common/types/domain';
import {
  FILE_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  SO_DASHBOARD_ATTACHMENT_TYPE,
  SO_DISCOVER_SESSION_ATTACHMENT_TYPE,
  SO_LENS_ATTACHMENT_TYPE,
  SO_MAP_ATTACHMENT_TYPE,
  SO_RULE_ATTACHMENT_TYPE,
  SO_VISUALIZATION_ATTACHMENT_TYPE,
} from '../../common/constants';

import { decodeWithExcessOrThrow } from '../common/runtime_types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { commentAttachmentType } from '../attachment_framework/attachments';
import { jsonValueRt } from '../../common/api/runtime_types';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry,
  persistableStateRegistry: PersistableStateAttachmentTypeRegistry,
  unifiedRegistry: UnifiedAttachmentTypeRegistry
) => {
  externalRefRegistry.register({ id: FILE_ATTACHMENT_TYPE, schemaValidator });
  unifiedRegistry.register({ id: LENS_ATTACHMENT_TYPE, schemaValidator: lensSchemaValidator });
  unifiedRegistry.register(commentAttachmentType);
  unifiedRegistry.register({
    id: SO_DASHBOARD_ATTACHMENT_TYPE,
    schemaValidator: savedObjectDashboardMetadataValidator,
  });
  unifiedRegistry.register({
    id: SO_VISUALIZATION_ATTACHMENT_TYPE,
    schemaValidator: savedObjectVisualizationMetadataValidator,
  });
  unifiedRegistry.register({
    id: SO_DISCOVER_SESSION_ATTACHMENT_TYPE,
    schemaValidator: savedObjectSearchMetadataValidator,
  });
  unifiedRegistry.register({
    id: SO_RULE_ATTACHMENT_TYPE,
    schemaValidator: savedObjectRuleMetadataValidator,
  });
  unifiedRegistry.register({
    id: SO_LENS_ATTACHMENT_TYPE,
    schemaValidator: savedObjectLensMetadataValidator,
  });
  unifiedRegistry.register({
    id: SO_MAP_ATTACHMENT_TYPE,
    schemaValidator: savedObjectMapMetadataValidator,
  });
};

const schemaValidator = (data: unknown): void => {
  const fileMetadata = decodeWithExcessOrThrow(FileAttachmentMetadataRt)(data);

  if (fileMetadata.files.length > 1) {
    throw badRequest('Only a single file can be stored in an attachment');
  }
};

const LensAttachmentDataRt = rt.strict({
  state: rt.record(rt.string, jsonValueRt),
});

const lensSchemaValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(LensAttachmentDataRt)(data);
};

const makeSavedObjectMetadataRt = (expectedType: string) =>
  rt.strict({
    title: rt.string,
    savedObjectType: rt.literal(expectedType),
  });

const SavedObjectDashboardMetadataRt = makeSavedObjectMetadataRt('dashboard');
const SavedObjectVisualizationMetadataRt = makeSavedObjectMetadataRt('visualization');
const SavedObjectSearchMetadataRt = makeSavedObjectMetadataRt('search');
const SavedObjectRuleMetadataRt = makeSavedObjectMetadataRt('alert');
const SavedObjectLensMetadataRt = makeSavedObjectMetadataRt('lens');
const SavedObjectMapMetadataRt = makeSavedObjectMetadataRt('map');

const savedObjectDashboardMetadataValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(SavedObjectDashboardMetadataRt)(data);
};

const savedObjectVisualizationMetadataValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(SavedObjectVisualizationMetadataRt)(data);
};

const savedObjectSearchMetadataValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(SavedObjectSearchMetadataRt)(data);
};

const savedObjectRuleMetadataValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(SavedObjectRuleMetadataRt)(data);
};

const savedObjectLensMetadataValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(SavedObjectLensMetadataRt)(data);
};

const savedObjectMapMetadataValidator = (data: unknown): void => {
  decodeWithExcessOrThrow(SavedObjectMapMetadataRt)(data);
};
