/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { validateView, type ViewSpec } from '@kbn/adaptive-ui';
import {
  toInvestigationViewSpec,
  toSignificantEventAttachmentViewSpec,
  type InvestigationInput,
} from '@kbn/adaptive-ui-adapters';
import type { GetInvestigationResponse } from '@kbn/nightshift-investigations-plugin/server';
import type { SignificantEventsPluginStart } from '@kbn/significant-events-plugin/server';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { registeredViewIds } from '../../common/constants';

export interface InvestigationLookup {
  getInvestigationsClient: (request: KibanaRequest) => {
    get: (investigationId: string) => Promise<GetInvestigationResponse>;
  };
}

export interface ResolveLiveViewDeps {
  getSignificantEvents: () => Promise<SignificantEventsPluginStart | undefined>;
  getNightshiftInvestigations: () => Promise<InvestigationLookup | undefined>;
}

export interface RequestedViewInput {
  event_id?: string;
  investigation_id?: string;
}

export type ResolveLiveViewResult = { ok: true; spec: ViewSpec } | { ok: false; message: string };

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'InvestigationNotFoundError';

const pickInvestigationId = (event: SignificantEvent): string | undefined => {
  const investigations = event.investigations ?? [];
  if (investigations.length === 0) {
    return undefined;
  }
  const completed = investigations.filter((item) => item.completed_at);
  const pool = completed.length > 0 ? completed : investigations;
  return [...pool]
    .sort((left, right) => (left.started_at ?? '').localeCompare(right.started_at ?? ''))
    .at(-1)?.workflow_execution_id;
};

const toInvestigationInput = (investigation: GetInvestigationResponse): InvestigationInput => {
  // `result` is already validated against `investigationStateSchema` by the investigations
  // client, which drops it wholesale rather than handing back a half-parsed payload.
  const { result, subject, conclusion } = investigation;
  const eventId = subject?.type === 'significant_event' ? subject.id : undefined;

  return {
    investigation_id: investigation.investigation_id,
    status: investigation.status,
    event_id: eventId,
    summary: result?.summary ?? conclusion ?? 'Investigation has no structured summary yet.',
    conclusion: result?.conclusion ?? conclusion,
    recommendations: result?.recommendations,
    blind_spots: result?.blind_spots,
    hypotheses: result?.hypotheses,
  };
};

const validatedSpec = (spec: ViewSpec, viewId: string): ResolveLiveViewResult => {
  const validation = validateView(spec);
  if (!validation.valid) {
    return {
      ok: false,
      message: `Registered view "${viewId}" produced an invalid ViewSpec: ${validation.errors.join(
        '; '
      )}`,
    };
  }
  return { ok: true, spec };
};

const resolveSignificantEvent = async (
  input: RequestedViewInput,
  request: KibanaRequest,
  getSignificantEvents: ResolveLiveViewDeps['getSignificantEvents']
): Promise<ResolveLiveViewResult> => {
  const eventId = input.event_id;
  if (!eventId) {
    return {
      ok: false,
      message:
        'streams.significantEvent requires input.event_id for a live significant event. This view does not render sample data.',
    };
  }

  const significantEvents = await getSignificantEvents();
  if (!significantEvents) {
    return {
      ok: false,
      message: 'Significant Events is not available in this deployment.',
    };
  }

  let event: SignificantEvent | undefined;
  try {
    event = await significantEvents.getEventById(request, eventId);
  } catch (error) {
    return {
      ok: false,
      message: `Failed to load significant event "${eventId}": ${asErrorMessage(error)}`,
    };
  }

  if (!event) {
    return {
      ok: false,
      message: `Significant event "${eventId}" was not found.`,
    };
  }

  return validatedSpec(
    toSignificantEventAttachmentViewSpec(event),
    registeredViewIds.significantEvent
  );
};

const resolveInvestigation = async (
  input: RequestedViewInput,
  request: KibanaRequest,
  deps: ResolveLiveViewDeps
): Promise<ResolveLiveViewResult> => {
  const nightshiftInvestigations = await deps.getNightshiftInvestigations();
  if (!nightshiftInvestigations) {
    return {
      ok: false,
      message: 'Nightshift Investigations is not available in this deployment.',
    };
  }

  let investigationId = input.investigation_id;
  if (!investigationId && input.event_id) {
    const significantEvents = await deps.getSignificantEvents();
    if (!significantEvents) {
      return {
        ok: false,
        message:
          'nightshift.investigation with event_id requires Significant Events to resolve the attached investigation.',
      };
    }

    let event: SignificantEvent | undefined;
    try {
      event = await significantEvents.getEventById(request, input.event_id);
    } catch (error) {
      return {
        ok: false,
        message: `Failed to load significant event "${input.event_id}": ${asErrorMessage(error)}`,
      };
    }

    if (!event) {
      return {
        ok: false,
        message: `Significant event "${input.event_id}" was not found.`,
      };
    }

    investigationId = pickInvestigationId(event);
    if (!investigationId) {
      return {
        ok: false,
        message: `Significant event "${input.event_id}" has no attached investigation.`,
      };
    }
  }

  if (!investigationId) {
    return {
      ok: false,
      message:
        'nightshift.investigation requires input.investigation_id, or input.event_id for that event’s latest attached investigation. This view does not render sample data.',
    };
  }

  try {
    const investigation = await nightshiftInvestigations
      .getInvestigationsClient(request)
      .get(investigationId);
    return validatedSpec(
      toInvestigationViewSpec(toInvestigationInput(investigation)),
      registeredViewIds.investigation
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return {
        ok: false,
        message: `Investigation "${investigationId}" was not found.`,
      };
    }
    return {
      ok: false,
      message: `Failed to load investigation "${investigationId}": ${asErrorMessage(error)}`,
    };
  }
};

/** Looks up a live event or investigation and maps it to a ViewSpec. Never uses sample fixtures. */
export const resolveLiveView = async (
  viewId: string,
  input: RequestedViewInput,
  request: KibanaRequest,
  deps: ResolveLiveViewDeps
): Promise<ResolveLiveViewResult> => {
  if (viewId === registeredViewIds.significantEvent) {
    return resolveSignificantEvent(input, request, deps.getSignificantEvents);
  }
  if (viewId === registeredViewIds.investigation) {
    return resolveInvestigation(input, request, deps);
  }
  return { ok: false, message: `Unknown view "${viewId}".` };
};
