/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MergeCasesPreviewRequest } from '../../../../common/types/api';
import type {
  AttachmentV2,
  Case,
  CustomFieldsConfiguration,
} from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { resolveTemplateFields } from '../../../../common/utils/template_fields';
import { Operations } from '../../../authorization';
import type { AlertInfo } from '../../../common/types';
import { loadFieldLinkIndexes } from '../../../common/utils/mirror_custom_fields';
import { buildActiveLinkMaps } from '../../../common/utils/pair_field_representations';
import { parseTemplate } from '../../../routes/api/templates/parse_template';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import { resolveGlobalFieldsWithoutStaleMirrorRequired } from '../validators';
import type { MergeAttachmentPlan } from './attachments';
import { buildAttachmentPlan, collectAlertsToCheck, orderCasesForMerge } from './attachments';
import type { MergeFieldsResult, MergeTemplateCandidate, MergeTemplates } from './fields';
import { buildMergeFields, templateVersionKey } from './fields';

export interface MergeContext {
  owner: string;
  /** An existing destination first, then the sources oldest first. */
  orderedCases: Case[];
  destination?: Case;
  /** Oldest first. */
  sources: Case[];
  attachmentsByCaseId: Map<string, AttachmentV2[]>;
  fields: MergeFieldsResult;
  plan: MergeAttachmentPlan;
  /** Alerts the destination holds that don't list it in their cases. */
  missingDestinationAlerts: AlertInfo[];
  hasPlatinumLicense: boolean;
  canChangeAssignees: boolean;
}

const loadTemplates = async (
  orderedCases: Case[],
  destination: Case | undefined,
  owner: string,
  { services: { templatesService, fieldDefinitionsService } }: CasesClientArgs
): Promise<MergeTemplates> => {
  const candidates = new Map<string, MergeTemplateCandidate>();
  const fieldsByVersion = new Map<string, InlineField[]>();
  const templateIds = [
    ...new Set(
      orderedCases.map(({ template }) => template?.id).filter((id): id is string => id != null)
    ),
  ];
  if (templateIds.length === 0) {
    return { enabled: true, candidates, fieldsByVersion };
  }

  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
  const resolveVersion = async (id: string, version?: number) => {
    const templateSO = await templatesService.getTemplate(
      id,
      version !== undefined ? String(version) : undefined,
      { includeDeleted: false }
    );
    if (templateSO == null || templateSO.attributes.owner !== owner) {
      return undefined;
    }
    try {
      const parsed = parseTemplate(templateSO.attributes);
      fieldsByVersion.set(
        templateVersionKey(id, templateSO.attributes.templateVersion),
        resolveTemplateFields(parsed.definition.fields, fieldDefinitions)
      );
    } catch {
      // A template with an invalid definition contributes no fields.
    }
    return templateSO.attributes;
  };

  await Promise.all(
    templateIds.map(async (id) => {
      const latest = await resolveVersion(id);
      candidates.set(id, {
        id,
        name: latest?.name ?? id,
        // A deleted template, or one of another owner, can't be applied either.
        isEnabled: latest != null && latest.isEnabled !== false,
        version: latest?.templateVersion ?? 1,
      });
    })
  );

  // The destination keeps its template at the version it pinned.
  const pinned = destination?.template;
  if (pinned != null && !fieldsByVersion.has(templateVersionKey(pinned.id, pinned.version))) {
    await resolveVersion(pinned.id, pinned.version);
  }

  return { enabled: true, candidates, fieldsByVersion };
};

const loadLinkedStorageKeys = async (
  owner: string,
  customFieldsConfiguration: CustomFieldsConfiguration,
  { services: { fieldDefinitionsService } }: CasesClientArgs
): Promise<Set<string>> => {
  if (customFieldsConfiguration.length === 0) {
    return new Set();
  }
  const indexes = await loadFieldLinkIndexes(owner, fieldDefinitionsService);
  return new Set(buildActiveLinkMaps(customFieldsConfiguration, indexes).byStorageKey.keys());
};

/**
 * Reads the cases, their attachments and everything the field defaults depend on through the
 * authorized client methods, and rejects selections that can't be merged. Writes nothing.
 */
export const loadMergeContext = async (
  { caseIds, destinationCaseId, fields: requestFields, attachments }: MergeCasesPreviewRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<MergeContext> => {
  const {
    authorization,
    config,
    services: { alertsService, licensingService, fieldDefinitionsService },
  } = clientArgs;

  if (new Set(caseIds).size !== caseIds.length) {
    throw Boom.badRequest('Each case can be merged only once.');
  }

  // A destination outside `caseIds` is the case an earlier run of the same merge created.
  const idsToRead =
    destinationCaseId != null && !caseIds.includes(destinationCaseId)
      ? [...caseIds, destinationCaseId]
      : caseIds;
  const { cases, errors } = await casesClient.cases.bulkGet({ ids: idsToRead });

  if (errors.length > 0) {
    const [{ caseId, message, status }] = errors;
    throw new Boom.Boom(`Case ${caseId} can't be merged: ${message}`, {
      statusCode: status ?? 400,
    });
  }

  const owners = new Set(cases.map(({ owner }) => owner));
  if (owners.size > 1) {
    throw Boom.badRequest('Cases from different solutions cannot be merged.');
  }

  const orderedCases = orderCasesForMerge(cases, destinationCaseId);
  const destination =
    destinationCaseId != null ? orderedCases.find(({ id }) => id === destinationCaseId) : undefined;

  if (destination?.status === CaseStatuses.closed) {
    throw Boom.badRequest(
      `The destination case ${destination.id} is closed. Reopen it to merge cases into it.`
    );
  }

  const owner = orderedCases[0].owner;
  const sources = orderedCases.filter(({ id }) => id !== destination?.id);

  const [attachmentsByCaseId, hasPlatinumLicense, canAssign, configurations] = await Promise.all([
    Promise.all(
      orderedCases.map(
        async ({ id }) => [id, await casesClient.attachments.getAll({ caseID: id })] as const
      )
    ).then((entries) => new Map<string, AttachmentV2[]>(entries)),
    licensingService.isAtLeastPlatinum(),
    authorization.isAuthorized({ owners: [owner], operation: Operations.assignCase }),
    casesClient.configure.get({ owner }),
  ]);

  const customFieldsConfiguration = configurations[0]?.customFields ?? [];
  const templatesEnabled = config.templates.enabled;
  const [linkedStorageKeys, templates, globalFields] = await Promise.all([
    loadLinkedStorageKeys(owner, customFieldsConfiguration, clientArgs),
    templatesEnabled
      ? loadTemplates(orderedCases, destination, owner, clientArgs)
      : Promise.resolve<MergeTemplates>({
          enabled: false,
          candidates: new Map(),
          fieldsByVersion: new Map(),
        }),
    templatesEnabled
      ? resolveGlobalFieldsWithoutStaleMirrorRequired(
          owner,
          fieldDefinitionsService,
          customFieldsConfiguration
        )
      : Promise.resolve<InlineField[]>([]),
  ]);

  const canChangeAssignees = hasPlatinumLicense && canAssign;
  const fields = buildMergeFields({
    orderedCases,
    destination,
    requestFields,
    customFieldsConfiguration,
    linkedStorageKeys,
    templates,
    globalFields,
    canChangeAssignees,
    assigneesUnavailableReason: !hasPlatinumLicense ? 'license' : canAssign ? null : 'privilege',
  });

  const alertsToCheck = collectAlertsToCheck({
    orderedCases,
    attachmentsByCaseId,
    destinationCaseId: destination?.id,
  });
  const { ineligible, missingDestination } = await alertsService.getAlertsMergeEligibility({
    ...alertsToCheck,
    destinationId: destination?.id,
  });

  const plan = buildAttachmentPlan({
    orderedCases,
    attachmentsByCaseId,
    destinationCaseId: destination?.id,
    choices: attachments,
    ineligibleAlerts: ineligible,
    copyObservables: hasPlatinumLicense,
    alreadyMergedSourceIds: new Set(
      destination == null
        ? []
        : sources
            .filter(({ merge }) => merge?.merged_into.includes(destination.id) === true)
            .map(({ id }) => id)
    ),
  });

  return {
    owner,
    orderedCases,
    destination,
    sources,
    attachmentsByCaseId,
    fields,
    plan,
    missingDestinationAlerts: missingDestination,
    hasPlatinumLicense,
    canChangeAssignees,
  };
};
