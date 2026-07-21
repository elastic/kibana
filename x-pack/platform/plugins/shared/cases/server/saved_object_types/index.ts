/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { createCaseSavedObjectType } from './cases/cases';
import { caseConfigureSavedObjectType } from './configure';
import { createCaseCommentSavedObjectType } from './comments';
import { createCaseUserActionSavedObjectType } from './user_actions';
import { caseConnectorMappingsSavedObjectType } from './connector_mappings';
import { casesTelemetrySavedObjectType } from './telemetry';
import { casesRulesSavedObjectType } from './cases_rules';
import { caseIdIncrementerSavedObjectType } from './id_incrementer';
import { createCaseAttachmentSavedObjectType } from './attachments';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';
import { caseTemplateSavedObjectType } from './templates';
import { caseFieldDefinitionSavedObjectType } from './field_definitions';
import type { ConfigType } from '../config';

interface RegisterSavedObjectsArgs {
  core: CoreSetup;
  logger: Logger;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  config: ConfigType;
}

export const registerSavedObjects = ({
  core,
  logger,
  persistableStateAttachmentTypeRegistry,
  lensEmbeddableFactory,
  config,
}: RegisterSavedObjectsArgs) => {
  core.savedObjects.registerType(
    createCaseCommentSavedObjectType({
      migrationDeps: {
        persistableStateAttachmentTypeRegistry,
        lensEmbeddableFactory,
      },
    })
  );

  core.savedObjects.registerType(caseConfigureSavedObjectType);
  core.savedObjects.registerType(caseConnectorMappingsSavedObjectType);
  core.savedObjects.registerType(caseIdIncrementerSavedObjectType);
  core.savedObjects.registerType(createCaseSavedObjectType(core, logger, config));
  core.savedObjects.registerType(
    createCaseUserActionSavedObjectType({
      persistableStateAttachmentTypeRegistry,
    })
  );

  core.savedObjects.registerType(casesTelemetrySavedObjectType);
  core.savedObjects.registerType(casesRulesSavedObjectType);

  // SO type registration must be unconditional (enforced by
  // @kbn/eslint/no_conditional_saved_object_type_registration). The templates
  // feature stays gated behind `xpack.cases.templates.enabled` (routes, UI,
  // and the v1->v2 backfill/migration task), but the SO mappings are always
  // registered so a serverless release has them in place before a later
  // release enables the feature and runs the backfill.
  core.savedObjects.registerType(caseTemplateSavedObjectType);
  core.savedObjects.registerType(caseFieldDefinitionSavedObjectType);
  core.savedObjects.registerType(createCaseAttachmentSavedObjectType());
};
