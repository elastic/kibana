/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import { logger } from './logger';
import type {
  CreatedAttachment,
  KbnContext,
  SpaceConfig,
  TemplateFieldUserType,
  TemplateInput,
} from './types';
import {
  AUTO_GENERATED_TAG,
  casesBasePath,
  chunk,
  dedupe,
  formatRequestError,
  runWithRetry,
} from './utils';

const CASE_DELETE_BATCH_SIZE = 100;
const TEMPLATE_DELETE_BATCH_SIZE = 1000;
const FIND_PAGE_SIZE = 100;

function isAlreadyExistsError(err: unknown): boolean {
  const message = (err as Error).message ?? '';
  return message.includes('already exists') || message.includes('409');
}

function fieldLetter(index: number): string {
  // Excel-style: 0→A, 25→Z, 26→AA, 51→AZ, 52→BA, …, 701→ZZ, 702→AAA.
  let n = index;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function buildTemplateField(
  index: number,
  userType: TemplateFieldUserType
): Record<string, unknown> {
  const letter = fieldLetter(index);
  const name = `field${letter}_as_${userType}`;
  const label = `Field ${letter} (${userType})`;

  switch (userType) {
    case 'keyword':
      return {
        control: 'INPUT_TEXT',
        name,
        label,
        type: 'keyword',
        metadata: { default: 'sample-value' },
      };
    case 'integer':
      return {
        control: 'INPUT_NUMBER',
        name,
        label,
        type: 'integer',
        metadata: { default: 42 },
      };
    case 'boolean':
      return {
        control: 'RADIO_GROUP',
        name,
        label,
        type: 'keyword',
        metadata: { options: ['true', 'false'], default: 'false' },
      };
    case 'textarea':
      return {
        control: 'TEXTAREA',
        name,
        label,
        type: 'keyword',
        metadata: { default: 'Sample paragraph of text.' },
      };
    case 'date':
      return {
        control: 'DATE_PICKER',
        name,
        label,
        type: 'date',
        metadata: { show_time: false, timezone: 'utc' },
      };
    case 'select':
      return {
        control: 'SELECT_BASIC',
        name,
        label,
        type: 'keyword',
        metadata: { options: ['alpha', 'beta', 'gamma'] },
      };
    case 'checkbox':
      return {
        control: 'CHECKBOX_GROUP',
        name,
        label,
        type: 'keyword',
        metadata: { options: ['alpha', 'beta'], default: ['alpha'] },
      };
    case 'radio':
      return {
        control: 'RADIO_GROUP',
        name,
        label,
        type: 'keyword',
        metadata: { options: ['alpha', 'beta', 'gamma'], default: 'alpha' },
      };
    case 'user':
      return {
        control: 'USER_PICKER',
        name,
        label,
        type: 'keyword',
        metadata: { multiple: false },
      };
  }
}

function buildAttachmentSO(attachment: CreatedAttachment) {
  const now = new Date().toISOString();
  const id = uuidv4();

  const attributes: Record<string, unknown> = {
    type: attachment.type,
    attachmentId: id,
    created_at: now,
    created_by: { username: 'elastic' },
    pushed_at: null,
    updated_at: null,
  };

  if (attachment.type === 'user') {
    attributes.data = { content: attachment.comment };
  } else if (attachment.type === 'alert') {
    attributes.data = {
      alertId: attachment.alertId,
      index: attachment.index,
      rule: attachment.rule,
    };
    attributes.metadata = { actionType: 'alert' };
  } else if (attachment.type === 'event') {
    attributes.data = { eventId: attachment.eventId, index: attachment.index };
    attributes.metadata = { actionType: 'event' };
  }

  return {
    type: 'cases-attachments',
    id,
    attributes,
    references: [{ id: attachment.caseId, name: 'associated-cases', type: 'cases' }],
  };
}

export async function bulkCreateAttachmentSOs({
  ctx,
  attachments,
  space,
}: {
  ctx: KbnContext;
  attachments: CreatedAttachment[];
  space: string;
}) {
  if (attachments.length === 0) return;

  const soPath = `${casesBasePath(space)}/api/saved_objects/_bulk_create`;
  const docs = attachments.map((attachment) => buildAttachmentSO(attachment));

  const chunkSize = 200;
  for (let start = 0; start < docs.length; start += chunkSize) {
    const chunk = docs.slice(start, start + chunkSize);
    try {
      await runWithRetry(
        () =>
          ctx.kbnClient.request({ method: 'POST', path: soPath, headers: ctx.headers, body: chunk }),
        { label: 'bulk_create_attachment_sos' }
      );
    } catch (err) {
      logger.error(`Error bulk-creating attachment SOs: ${formatRequestError(err)}`);
    }
    logger.info(`  [attachments SO] ${Math.min(start + chunkSize, docs.length)}/${docs.length}`);
  }
}

export async function createTemplates({
  ctx,
  space,
  owner,
  templates,
}: {
  ctx: KbnContext;
  space: string;
  owner: string;
  templates: TemplateInput[];
}) {
  if (templates.length === 0) return;

  const templatesPath = `${casesBasePath(space)}/internal/cases/templates`;
  const spaceLabel = space || 'default';

  logger.info(`Creating ${templates.length} template(s) for owner "${owner}" in space "${spaceLabel}"...`);

  for (const template of templates) {
    const fields = template.fieldTypes.map((userType, index) =>
      buildTemplateField(index, userType)
    );
    const tags = dedupe([...(template.tags ?? []), AUTO_GENERATED_TAG]);
    const definitionObj: Record<string, unknown> = {
      name: template.name,
      fields,
      tags,
    };
    if (template.description) definitionObj.description = template.description;

    const definition = yaml.dump(definitionObj);
    const body: Record<string, unknown> = { owner, definition, tags };
    if (template.description) body.description = template.description;

    try {
      await runWithRetry(
        () =>
          ctx.kbnClient.request({
            method: 'POST',
            path: templatesPath,
            headers: ctx.headers,
            body,
          }),
        { label: `create_template_${template.name}` }
      );
      const fieldsLabel =
        fields.length > 0
          ? ` with ${fields.length} field(s): ${template.fieldTypes.join(', ')}`
          : '';
      logger.info(`  Created template "${template.name}" for owner "${owner}"${fieldsLabel}`);
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        logger.info(`  Template "${template.name}" already exists for owner "${owner}", skipping`);
      } else {
        logger.error(
          `Failed to create template "${template.name}" for owner "${owner}": ${formatRequestError(err)}`
        );
      }
    }
  }
}

export async function createSpace(ctx: KbnContext, spaceId: string): Promise<void> {
  try {
    await runWithRetry(
      () =>
        ctx.kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          headers: ctx.headers,
          body: { id: spaceId, name: spaceId, disabledFeatures: [] },
        }),
      { label: `create_space_${spaceId}` }
    );
    logger.info(`  Created space "${spaceId}"`);
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      logger.info(`  Space "${spaceId}" already exists, skipping`);
      return;
    }
    logger.error(`  Failed to create space "${spaceId}": ${formatRequestError(err)}`);
  }
}

export async function createSpaces(ctx: KbnContext, config: SpaceConfig): Promise<string[]> {
  const spaceIds = Array.from({ length: config.count }, (_, i) =>
    config.namePattern.replace('{i}', String(i + 1))
  );

  logger.info(`Creating ${spaceIds.length} space(s) with pattern "${config.namePattern}"...`);
  await pMap(spaceIds, (spaceId) => createSpace(ctx, spaceId), { concurrency: 5 });
  return spaceIds;
}

export async function enableAnalyticsForOwner({
  ctx,
  space,
  owner,
}: {
  ctx: KbnContext;
  space: string;
  owner: string;
}): Promise<void> {
  const configurePath = `${casesBasePath(space)}/api/cases/configure`;
  const spaceLabel = space || 'default';

  try {
    const { data: existing } = await runWithRetry(
      () =>
        ctx.kbnClient.request<Array<{ id: string; version: string }>>({
          method: 'GET',
          path: `${configurePath}?owner=${owner}`,
          headers: ctx.headers,
        }),
      { label: `get_case_config_${owner}_${spaceLabel}` }
    );

    if (existing.length > 0) {
      const { id, version } = existing[0];
      await runWithRetry(
        () =>
          ctx.kbnClient.request({
            method: 'PATCH',
            path: `${configurePath}/${id}`,
            headers: ctx.headers,
            body: { analytics_enabled: true, version },
          }),
        { label: `patch_case_config_${owner}_${spaceLabel}` }
      );
      logger.info(
        `  Enabled analytics for owner "${owner}" in space "${spaceLabel}" (updated existing config)`
      );
      return;
    }

    await runWithRetry(
      () =>
        ctx.kbnClient.request({
          method: 'POST',
          path: configurePath,
          headers: ctx.headers,
          body: {
            owner,
            analytics_enabled: true,
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
            closure_type: 'close-by-user',
          },
        }),
      { label: `create_case_config_${owner}_${spaceLabel}` }
    );
    logger.info(`  Enabled analytics for owner "${owner}" in space "${spaceLabel}" (created new config)`);
  } catch (err) {
    if (isAlreadyExistsError(err)) {
      logger.info(
        `  Analytics config for owner "${owner}" in space "${spaceLabel}" already exists, skipping`
      );
      return;
    }
    logger.error(
      `  Failed to enable analytics for owner "${owner}" in space "${spaceLabel}": ${formatRequestError(err)}`
    );
  }
}

export async function enableAnalyticsForSpaces({
  ctx,
  spaces,
  owners,
}: {
  ctx: KbnContext;
  spaces: string[];
  owners: string[];
}): Promise<void> {
  if (owners.length === 0 || spaces.length === 0) return;
  logger.info(`Enabling analytics for owners [${owners.join(', ')}] across ${spaces.length} space(s)...`);

  const work = spaces.flatMap((space) => owners.map((owner) => ({ owner, space })));

  await pMap(work, ({ owner, space }) => enableAnalyticsForOwner({ ctx, space, owner }), {
    concurrency: 6,
  });
}

async function findCaseIdsByTag(ctx: KbnContext, space: string, tag: string): Promise<string[]> {
  const findPath = `${casesBasePath(space)}/api/cases/_find`;
  const ids: string[] = [];
  let page = 1;
  while (true) {
    const { data } = await runWithRetry(
      () =>
        ctx.kbnClient.request<{ cases: Array<{ id: string }>; total: number }>({
          method: 'GET',
          path: `${findPath}?tags=${encodeURIComponent(tag)}&page=${page}&perPage=${FIND_PAGE_SIZE}&sortField=createdAt&sortOrder=asc`,
          headers: ctx.headers,
        }),
      { label: `find_cases_by_tag_${tag}_p${page}` }
    );
    if (data.cases.length === 0) break;
    for (const c of data.cases) ids.push(c.id);
    if (ids.length >= data.total) break;
    page += 1;
  }
  return ids;
}

export async function cleanupCases({
  ctx,
  space,
  tag,
}: {
  ctx: KbnContext;
  space: string;
  tag: string;
}): Promise<number> {
  const spaceLabel = space || 'default';
  const ids = await findCaseIdsByTag(ctx, space, tag);
  if (ids.length === 0) {
    logger.info(`  No cases tagged "${tag}" in space "${spaceLabel}"`);
    return 0;
  }
  logger.info(`  Found ${ids.length} case(s) tagged "${tag}" in space "${spaceLabel}"`);
  for (const batch of chunk(ids, CASE_DELETE_BATCH_SIZE)) {
    const idsParam = batch.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
    try {
      await runWithRetry(
        () =>
          ctx.kbnClient.request({
            method: 'DELETE',
            path: `${casesBasePath(space)}/api/cases?${idsParam}`,
            headers: ctx.headers,
          }),
        { label: `bulk_delete_cases_${batch.length}` }
      );
      logger.info(`  Deleted ${batch.length} case(s)`);
    } catch (err) {
      logger.error(`  Failed to delete case batch: ${formatRequestError(err)}`);
    }
  }
  return ids.length;
}

async function findTemplateIdsByTag(
  ctx: KbnContext,
  space: string,
  owners: string[],
  tag: string
): Promise<string[]> {
  const listPath = `${casesBasePath(space)}/internal/cases/templates`;
  const ids: string[] = [];
  for (const owner of owners) {
    let page = 1;
    while (true) {
      const { data } = await runWithRetry(
        () =>
          ctx.kbnClient.request<{
            templates: Array<{ templateId: string; tags?: string[] }>;
            total: number;
          }>({
            method: 'GET',
            path: `${listPath}?owner=${encodeURIComponent(owner)}&tags=${encodeURIComponent(tag)}&page=${page}&perPage=${FIND_PAGE_SIZE}`,
            headers: ctx.headers,
          }),
        { label: `find_templates_${owner}_p${page}` }
      );
      if (data.templates.length === 0) break;
      for (const t of data.templates) ids.push(t.templateId);
      if (data.templates.length < FIND_PAGE_SIZE) break;
      page += 1;
    }
  }
  return ids;
}

export async function cleanupTemplates({
  ctx,
  space,
  owners,
  tag,
}: {
  ctx: KbnContext;
  space: string;
  owners: string[];
  tag: string;
}): Promise<number> {
  const spaceLabel = space || 'default';
  if (owners.length === 0) return 0;
  const ids = await findTemplateIdsByTag(ctx, space, owners, tag);
  if (ids.length === 0) {
    logger.info(`  No templates tagged "${tag}" in space "${spaceLabel}"`);
    return 0;
  }
  logger.info(`  Found ${ids.length} template(s) tagged "${tag}" in space "${spaceLabel}"`);
  for (const batch of chunk(ids, TEMPLATE_DELETE_BATCH_SIZE)) {
    try {
      await runWithRetry(
        () =>
          ctx.kbnClient.request({
            method: 'POST',
            path: `${casesBasePath(space)}/internal/cases/templates/_bulk_delete`,
            headers: ctx.headers,
            body: { ids: batch },
          }),
        { label: `bulk_delete_templates_${batch.length}` }
      );
      logger.info(`  Deleted ${batch.length} template(s)`);
    } catch (err) {
      logger.error(`  Failed to delete template batch: ${formatRequestError(err)}`);
    }
  }
  return ids.length;
}
