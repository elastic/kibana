/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicSetupDependencies } from '../types';
import type { UnifiedAttachmentTypeRegistry } from '../client/attachment_framework/unified_attachment_registry';
import { registerCasesTriggerDefinitions } from './triggers';

export function registerCasesSteps(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions'],
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  isCasesAttachmentsEnabled: boolean,
  isTemplatesEnabled: boolean
) {
  if (!workflowsExtensions) {
    return;
  }

  // Attachment types are registered during `start` (and by other solutions'
  // setup), so the registry is empty here at `setup`. The loader reads it
  // lazily and resolves to `undefined` when no authorable type exists, which
  // the step registry treats as a skipped registration.
  if (isCasesAttachmentsEnabled) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./add_attachments').then((m) =>
        m.getAddAttachmentsStepDefinition(unifiedAttachmentTypeRegistry)
      )
    );
  }

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.getCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./create_case').then((m) => m.createCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.updateCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.addCommentStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.updateCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./set_custom_field').then((m) => m.setCustomFieldStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.findCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.setSeverityStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.setStatusStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.closeCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.deleteCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.assignCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.unassignCaseStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.addAlertsStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.addEventsStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.findSimilarCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.setDescriptionStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.setTitleStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.addObservablesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.addTagsStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.removeTagsStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./set_category').then((m) => m.setCategoryStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.getCasesByAlertIdStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.getAllAttachmentsStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.updateObservableStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.deleteObservableStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.getCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./simple_steps').then((m) => m.pushCasesStepDefinition)
  );

  workflowsExtensions.registerStepDefinition(() =>
    import('./create_case_from_template').then((m) => m.createCreateCaseFromTemplateStepDefinition)
  );

  // Docs-only public definition, gated on the same templates feature flag that gates the server
  // handler's registration — the extended_fields surface only exists when the feature is on.
  if (isTemplatesEnabled) {
    workflowsExtensions.registerStepDefinition(() =>
      import('./simple_steps').then((m) => m.setExtendedFieldsStepDefinition)
    );
  }
}

export function registerCasesWorkflowTriggers(
  workflowsExtensions: CasesPublicSetupDependencies['workflowsExtensions']
) {
  registerCasesTriggerDefinitions(workflowsExtensions);
}
