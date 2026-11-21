/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'path';
import mime from 'mime-types';
import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { createCasesRoute } from '../routes/api/create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../routes/api/constants';
import type { CaseRoute } from '../routes/api/types';
import type { CasesRequestHandlerContext } from '../types';
import {
  INVESTIGATIONS_CAPABILITIES_URL,
  INVESTIGATIONS_DUPLICATES_URL,
  INVESTIGATIONS_FIND_URL,
  INVESTIGATIONS_INDICATOR_LOOKUP_URL,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_PROCEDURE_TEMPLATES_URL,
  INVESTIGATIONS_STATUSES_URL,
  INVESTIGATIONS_TYPES_URL,
} from '../../common/investigations/constants';
import type {
  BulkCreateItemsRequest,
  BulkUpdateItemsRequest,
  AddCommentRequest,
  CloseRecordRequest,
  FindCommentsRequest,
  UpdateCommentRequest,
  CreateActivityRequest,
  CreateRecordRequest,
  ExportItemsRequest,
  FindActivityRequest,
  FindItemsRequest,
  FindRecordsRequest,
  ProcedureTemplateTask,
  UpdateItemRequest,
  UpdateRecordRequest,
} from '../../common/investigations/types';
import type { InvestigationsService } from './service';
import type { StatusesConfiguration } from '../../common/investigations/statuses';
import {
  addCommentBody,
  reorderTasksBody,
  findCommentsQuery,
  recordCommentParams,
  updateCommentBody,
  applyProcedureBody,
  statusesBody,
  bulkCreateItemsBody,
  bulkDeleteItemsBody,
  bulkUpdateItemsBody,
  closeRecordBody,
  createActivityBody,
  createRecordBody,
  createThreadBody,
  duplicatesBody,
  exportItemsQuery,
  findActivityQuery,
  findItemsQuery,
  findRecordsQuery,
  historyQuery,
  importBody,
  indicatorLookupQuery,
  mergeRecordBody,
  preserveBody,
  procedureTemplateBody,
  procedureTemplateParams,
  recordIdParams,
  recordItemParams,
  sinceQuery,
  toArray,
  updateItemBody,
  updateRecordBody,
} from './schemas';

export type GetInvestigationsService = (args: {
  request: KibanaRequest;
  context: CasesRequestHandlerContext;
}) => Promise<InvestigationsService>;

const base = INVESTIGATIONS_INTERNAL_URL;
const internal = { access: 'internal' as const };

type AnyQuery = Record<string, unknown>;

const normalizeArrays = <T extends AnyQuery>(query: T, keys: string[]): T => {
  const out: AnyQuery = { ...query };
  for (const key of keys) out[key] = toArray(out[key]);
  return out as T;
};

const ITEM_ARRAY_KEYS = [
  'kind',
  'type',
  'indicator_type',
  'added_by',
  'added_by_type',
  'status',
  'ids',
  'refs',
];

/** All investigation routes, registered through the Cases router so errors are wrapped the same way. */
export const getInvestigationRoutes = (getService: GetInvestigationsService): CaseRoute[] => {
  const route = <P, Q, B>(r: CaseRoute<P, Q, B>) =>
    createCasesRoute<P, Q, B>({
      security: DEFAULT_CASES_ROUTE_SECURITY,
      routerOptions: internal,
      ...r,
    });

  return [
    route({
      method: 'post',
      path: base,
      params: { body: createRecordBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const record = await service.createRecord(request.body as CreateRecordRequest);
        return response.ok({ body: { record } });
      },
    }),
    route({
      method: 'get',
      path: INVESTIGATIONS_FIND_URL,
      params: { query: findRecordsQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const query = normalizeArrays(request.query as AnyQuery, [
          'status',
          'status_key',
          'assignees',
          'priority',
          'severity',
          'investigation_type',
          'verdict',
          'tags',
          'field',
        ]);
        return response.ok({ body: await service.findRecords(query as FindRecordsRequest) });
      },
    }),
    route({
      method: 'post',
      path: INVESTIGATIONS_DUPLICATES_URL,
      params: { body: duplicatesBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: await service.findDuplicates(request.body as never) });
      },
    }),
    route({
      method: 'get',
      path: INVESTIGATIONS_INDICATOR_LOOKUP_URL,
      params: { query: indicatorLookupQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { values, exclude_record_id: exclude } = request.query as {
          values: string | string[];
          exclude_record_id?: string;
        };
        return response.ok({
          body: await service.lookupIndicators(toArray(values) ?? [], exclude),
        });
      },
    }),
    route({
      method: 'get',
      path: INVESTIGATIONS_TYPES_URL,
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: { types: await service.listTypes() } });
      },
    }),
    route({
      method: 'get',
      path: INVESTIGATIONS_PROCEDURE_TEMPLATES_URL,
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: { templates: await service.listProcedureTemplates() } });
      },
    }),
    route({
      method: 'put',
      path: `${INVESTIGATIONS_PROCEDURE_TEMPLATES_URL}/{template_id}`,
      params: { params: procedureTemplateParams, body: procedureTemplateBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { template_id: templateId } = request.params as { template_id: string };
        const { tasks } = request.body as { tasks: ProcedureTemplateTask[] };
        return response.ok({
          body: { template: await service.saveProcedureTemplate(templateId, tasks) },
        });
      },
    }),
    route({
      method: 'get',
      path: INVESTIGATIONS_STATUSES_URL,
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: await service.getStatusesConfiguration() });
      },
    }),
    route({
      method: 'put',
      path: INVESTIGATIONS_STATUSES_URL,
      params: { body: statusesBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.saveStatusesConfiguration(request.body as StatusesConfiguration),
        });
      },
    }),
    route({
      method: 'get',
      path: INVESTIGATIONS_CAPABILITIES_URL,
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: await service.capabilities() });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}`,
      params: { params: recordIdParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.getRecord((request.params as { id: string }).id),
        });
      },
    }),
    route({
      method: 'patch',
      path: `${base}/{id}`,
      params: { params: recordIdParams, body: updateRecordBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const record = await service.updateRecord(
          (request.params as { id: string }).id,
          request.body as UpdateRecordRequest
        );
        return response.ok({ body: { record } });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/_close`,
      params: { params: recordIdParams, body: closeRecordBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const record = await service.closeRecord(
          (request.params as { id: string }).id,
          request.body as CloseRecordRequest
        );
        return response.ok({ body: { record } });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/comments`,
      params: { params: recordIdParams, query: findCommentsQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id } = request.params as { id: string };
        return response.ok({
          body: await service.findComments(id, request.query as FindCommentsRequest),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/comments`,
      params: { params: recordIdParams, body: addCommentBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id } = request.params as { id: string };
        return response.ok({
          body: { comment: await service.addComment(id, request.body as AddCommentRequest) },
        });
      },
    }),
    route({
      method: 'patch',
      path: `${base}/{id}/comments/{comment_id}`,
      params: { params: recordCommentParams, body: updateCommentBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id, comment_id: commentId } = request.params as { id: string; comment_id: string };
        return response.ok({
          body: {
            comment: await service.updateComment(
              id,
              commentId,
              request.body as UpdateCommentRequest
            ),
          },
        });
      },
    }),
    route({
      method: 'delete',
      path: `${base}/{id}/comments/{comment_id}`,
      params: { params: recordCommentParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id, comment_id: commentId } = request.params as { id: string; comment_id: string };
        await service.deleteComment(id, commentId);
        return response.noContent();
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/tasks/_reorder`,
      params: { params: recordIdParams, body: reorderTasksBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id } = request.params as { id: string };
        const { task_ids: taskIds } = request.body as { task_ids: string[] };
        return response.ok({ body: { tasks: await service.reorderTasks(id, taskIds) } });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/_reopen`,
      params: { params: recordIdParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: { record: await service.reopenRecord((request.params as { id: string }).id) },
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/_merge`,
      params: { params: recordIdParams, body: mergeRecordBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { other_id: otherId, keep } = request.body as {
          other_id: string;
          keep: 'this' | 'other';
        };
        return response.ok({
          body: await service.mergeRecord((request.params as { id: string }).id, otherId, keep),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/_apply_procedure`,
      params: { params: recordIdParams, body: applyProcedureBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { template_id: templateId, replace } = request.body as {
          template_id?: string | null;
          replace: boolean;
        };
        return response.ok({
          body: {
            tasks: await service.applyProcedure(
              (request.params as { id: string }).id,
              templateId ?? null,
              replace
            ),
          },
        });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/_related`,
      params: { params: recordIdParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: await service.related((request.params as { id: string }).id) });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/_since`,
      params: { params: recordIdParams, query: sinceQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.since(
            (request.params as { id: string }).id,
            (request.query as { since?: string }).since
          ),
        });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/_report`,
      params: { params: recordIdParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({ body: await service.report((request.params as { id: string }).id) });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/_history`,
      params: { params: recordIdParams, query: historyQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.history(
            (request.params as { id: string }).id,
            (request.query as { target_id?: string }).target_id
          ),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/threads`,
      params: { params: recordIdParams, body: createThreadBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.createThread(
            (request.params as { id: string }).id,
            request.body as { title: string; anchor?: string | null }
          ),
        });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/items`,
      params: { params: recordIdParams, query: findItemsQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const query = normalizeArrays(request.query as AnyQuery, ITEM_ARRAY_KEYS);
        return response.ok({
          body: await service.findItems(
            (request.params as { id: string }).id,
            query as FindItemsRequest
          ),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/items/_bulk_create`,
      params: { params: recordIdParams, body: bulkCreateItemsBody },
      routerOptions: { ...internal, body: { maxBytes: 64 * 1024 * 1024 } },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.bulkCreateItems(
            (request.params as { id: string }).id,
            request.body as BulkCreateItemsRequest
          ),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/items/_bulk_update`,
      params: { params: recordIdParams, body: bulkUpdateItemsBody },
      routerOptions: { ...internal, body: { maxBytes: 64 * 1024 * 1024 } },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.bulkUpdateItems(
            (request.params as { id: string }).id,
            request.body as BulkUpdateItemsRequest
          ),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/items/_bulk_delete`,
      params: { params: recordIdParams, body: bulkDeleteItemsBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.bulkDeleteItems(
            (request.params as { id: string }).id,
            (request.body as { ids: string[] }).ids
          ),
        });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/items/{item_id}`,
      params: { params: recordItemParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id, item_id: itemId } = request.params as { id: string; item_id: string };
        return response.ok({ body: { item: await service.getItem(id, itemId) } });
      },
    }),
    route({
      method: 'patch',
      path: `${base}/{id}/items/{item_id}`,
      params: { params: recordItemParams, body: updateItemBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id, item_id: itemId } = request.params as { id: string; item_id: string };
        try {
          return response.ok({
            body: { item: await service.updateItem(id, itemId, request.body as UpdateItemRequest) },
          });
        } catch (error) {
          if (Boom.isBoom(error) && error.output.statusCode === 409) {
            return response.conflict({ body: { message: error.message } });
          }
          throw error;
        }
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/items/{item_id}/_run_workflow`,
      params: { params: recordItemParams },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const { id, item_id: itemId } = request.params as { id: string; item_id: string };
        return response.ok({ body: { task: await service.runTaskWorkflow(id, itemId) } });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/evidence/_import`,
      params: { params: recordIdParams, body: importBody },
      routerOptions: { ...internal, body: { maxBytes: 12 * 1024 * 1024 } },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: await service.importIndicators(
            (request.params as { id: string }).id,
            (request.body as { csv: string }).csv
          ),
        });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/evidence/_export`,
      params: { params: recordIdParams, query: exportItemsQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const query = normalizeArrays(request.query as AnyQuery, ITEM_ARRAY_KEYS);
        const out = await service.exportItems(
          (request.params as { id: string }).id,
          query as unknown as ExportItemsRequest
        );
        return response.ok({
          body: out.body,
          headers: {
            'content-type': out.contentType,
            'content-disposition': `attachment; filename="${out.filename}"`,
          },
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/evidence/_preserve`,
      params: { params: recordIdParams, body: preserveBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: {
            items: await service.preserve(
              (request.params as { id: string }).id,
              (request.body as { ids: string[] }).ids
            ),
          },
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/files`,
      params: {
        params: recordIdParams,
        body: schema.object({
          file: schema.any(),
          filename: schema.maybe(schema.string({ maxLength: 512 })),
          why: schema.maybe(schema.string({ maxLength: 2048 })),
        }),
      },
      routerOptions: {
        ...internal,
        body: {
          maxBytes: 105 * 1024 * 1024,
          output: 'stream',
          parse: true,
          accepts: 'multipart/form-data',
        },
      },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const body = request.body as {
          file: NodeJS.ReadableStream & { hapi?: { filename: string } };
          filename?: string;
          why?: string;
        };
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of body.file as AsyncIterable<Buffer>) {
          size += chunk.length;
          if (size > 100 * 1024 * 1024) throw Boom.entityTooLarge('Files are limited to 100 MiB');
          chunks.push(Buffer.from(chunk));
        }
        const original = body.file.hapi?.filename ?? body.filename ?? 'upload';
        const filename = body.filename ?? original;
        const mimeType = mime.lookup(parse(original).ext.toLowerCase()) || undefined;
        const item = await service.addFileEvidence(
          (request.params as { id: string }).id,
          { buffer: Buffer.concat(chunks), filename, mimeType },
          body.why ?? null
        );
        return response.ok({ body: { item } });
      },
    }),
    route({
      method: 'get',
      path: `${base}/{id}/activity`,
      params: { params: recordIdParams, query: findActivityQuery },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        const query = normalizeArrays(request.query as AnyQuery, ['actor_type', 'action']);
        return response.ok({
          body: await service.findActivity(
            (request.params as { id: string }).id,
            query as FindActivityRequest
          ),
        });
      },
    }),
    route({
      method: 'post',
      path: `${base}/{id}/activity`,
      params: { params: recordIdParams, body: createActivityBody },
      handler: async ({ context, request, response }) => {
        const service = await getService({ context, request });
        return response.ok({
          body: {
            entry: await service.createActivity(
              (request.params as { id: string }).id,
              request.body as CreateActivityRequest
            ),
          },
        });
      },
    }),
  ] as CaseRoute[];
};
