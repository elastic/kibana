/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  getPageTriggerId,
  isPageTrigger,
  PAGE_TRIGGER_SOURCE,
  toWorkflowExecutionEngineModel,
} from '@kbn/workflows';
import type { PageTrigger } from '@kbn/workflows';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowPageRef } from './page_secret';
import type { WorkflowPageMissReason } from './types';
import {
  buildExternalResumeFormFieldsHtml,
  parseExternalResumeFormBody,
} from '../api/external_resume/external_resume_form_fields';
import {
  renderExternalResumeErrorPage,
  renderExternalResumeFormPage,
  renderExternalResumeSuccessPage,
} from '../api/external_resume/render_external_resume_page';
import type { WorkflowPageRequestOutcome } from '../api/routes/utils/workflow_audit_logging';
import type { ResolveWorkflowPageResult } from '../lib/resolve_workflow_page';
import type { WorkflowProperties } from '../storage/workflow_storage';

export const PAGE_PHISHING_NOTICE = i18n.translate('workflows.pages.phishingNotice', {
  defaultMessage:
    'A user of this Elastic deployment made this form, not Elastic. Do not use it to send passwords or sensitive personal information.',
});

const PAGE_SUBMITTED_MESSAGE = i18n.translate('workflows.pages.submittedMessage', {
  defaultMessage: 'Your submission was received. You can close this window.',
});

const PAGE_NOT_FOUND_TITLE = i18n.translate('workflows.pages.notFoundTitle', {
  defaultMessage: 'Page not available',
});

const PAGE_NOT_FOUND_MESSAGE = i18n.translate('workflows.pages.notFoundMessage', {
  defaultMessage:
    'This page does not exist or is offline. Ask the person who shared the link for a new one.',
});

export type PageRequest = WorkflowPageRef & { secret: string };

/** Why a page request got the 404. Only the audit log sees it. */
export type PageMissReason = WorkflowPageMissReason | 'pages_disabled' | 'unexpected_error';

interface ServablePage {
  workflow: WorkflowProperties;
  trigger: PageTrigger;
}

export interface PageSubmissionDeps {
  arePagesEnabled: () => Promise<boolean>;
  resolveWorkflowPage: (ref: WorkflowPageRef, secret: string) => Promise<ResolveWorkflowPageResult>;
  executeWorkflowAsServiceAccount: WorkflowsExecutionEnginePluginStart['executeWorkflowAsServiceAccount'];
}

/** The query a successful submit redirects to, so a refresh does not submit again. */
export const PAGE_SUBMITTED_QUERY = 'submitted';

/** The response to one page request, and what to audit about it. */
export interface PageResponse {
  statusCode: 200 | 303 | 400 | 404;
  /** The page body. Empty for the redirect after a submit. */
  html: string;
  /** Where a 303 sends the browser. */
  location?: string;
  outcome: WorkflowPageRequestOutcome;
  reason?: PageMissReason;
  executionId?: string;
}

/** Every miss looks the same: a bad secret, an offline page, a disabled kill switch. */
export const notFoundPage = (reason: PageMissReason): PageResponse => ({
  statusCode: 404,
  html: renderExternalResumeErrorPage(PAGE_NOT_FOUND_MESSAGE, PAGE_NOT_FOUND_TITLE),
  outcome: 'not_found',
  reason,
});

const resolvePage = async (
  deps: PageSubmissionDeps,
  { secret, ...ref }: PageRequest
): Promise<ServablePage | { reason: PageMissReason }> => {
  if (!(await deps.arePagesEnabled())) {
    return { reason: 'pages_disabled' };
  }
  const result = await deps.resolveWorkflowPage(ref, secret);
  if ('reason' in result) {
    return result;
  }
  // Resolving checked that the workflow has this page trigger.
  const trigger = result.workflow.definition?.triggers.find(
    (candidate): candidate is PageTrigger =>
      isPageTrigger(candidate) && getPageTriggerId(candidate) === ref.pageId
  );
  return trigger ? { workflow: result.workflow, trigger } : { reason: 'trigger_missing' };
};

const renderForm = (
  { trigger }: ServablePage,
  { values, errors }: { values?: Record<string, unknown>; errors?: string[] } = {}
): string =>
  renderExternalResumeFormPage({
    title: trigger.title,
    message: trigger.description,
    // An empty action posts back to the page URL, so the form needs no base path or space.
    formActionUrl: '',
    fieldsHtml: buildExternalResumeFormFieldsHtml(trigger.inputs, values),
    notice: PAGE_PHISHING_NOTICE,
    errors,
  });

/** Checks the form values against the page inputs. Returns every error, not only the first. */
export const validatePageSubmission = (
  body: Record<string, unknown>,
  schema: JsonModelSchemaType | undefined
): { inputs: Record<string, unknown> } | { errors: string[] } => {
  let parsed: Record<string, unknown>;
  try {
    parsed = parseExternalResumeFormBody(body, schema);
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
  const result = buildFieldsZodValidator(schema).safeParse(parsed);
  if (result.success) {
    return { inputs: result.data };
  }
  return {
    errors: result.error.issues.map(({ path, message }) =>
      path.length > 0 ? `${path.join('.')}: ${message}` : message
    ),
  };
};

/** GET: renders the form, or the confirmation after the redirect from a successful submit. */
export const getPageForm = async (
  deps: PageSubmissionDeps,
  request: PageRequest,
  { submitted = false }: { submitted?: boolean } = {}
): Promise<PageResponse> => {
  const page = await resolvePage(deps, request);
  if ('reason' in page) {
    return notFoundPage(page.reason);
  }
  const html = submitted
    ? renderExternalResumeSuccessPage(PAGE_SUBMITTED_MESSAGE)
    : renderForm(page);
  return { statusCode: 200, html, outcome: 'served' };
};

/**
 * POST: validates the values and starts the run as the page's service account. A 400 shows the
 * form again with every error and the visitor's values. A success redirects to a GET, so a
 * refresh or Back does not submit again (Post/Redirect/Get).
 */
export const submitPage = async (
  deps: PageSubmissionDeps,
  request: PageRequest,
  body: Record<string, unknown>
): Promise<PageResponse> => {
  const page = await resolvePage(deps, request);
  if ('reason' in page) {
    return notFoundPage(page.reason);
  }

  const validation = validatePageSubmission(body, page.trigger.inputs);
  if ('errors' in validation) {
    return {
      statusCode: 400,
      html: renderForm(page, { values: body, errors: validation.errors }),
      outcome: 'invalid_input',
    };
  }

  const { workflowExecutionId } = await deps.executeWorkflowAsServiceAccount(
    toWorkflowExecutionEngineModel({ ...page.workflow, id: request.workflowId }),
    {
      spaceId: request.spaceId,
      // Steps read a submission as `page.inputs`. `inputs` holds only manual, API, and child values.
      inputs: {},
      page: { inputs: validation.inputs },
      triggeredBy: PAGE_TRIGGER_SOURCE,
      metadata: { pageId: request.pageId },
    }
  );
  return {
    statusCode: 303,
    html: '',
    // A relative reference resolves against the page URL, so it needs no base path or space.
    location: `?${PAGE_SUBMITTED_QUERY}=1`,
    outcome: 'submitted',
    executionId: workflowExecutionId,
  };
};
