/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { ArrayElement } from '@kbn/utility-types';

export enum IngressCredentialAuditAction {
  ROTATE = 'connector_ingress_rotate',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<IngressCredentialAuditAction, VerbsTuple> = {
  connector_ingress_rotate: ['rotate', 'rotating', 'rotated'],
};

const eventTypes: Record<IngressCredentialAuditAction, ArrayElement<EcsEvent['type']> | undefined> =
  {
    connector_ingress_rotate: 'change',
  };

export const ingressCredentialAuditEvent = ({
  action,
  savedObject,
  outcome,
  error,
}: {
  action: IngressCredentialAuditAction;
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  outcome?: EcsEvent['outcome'];
  error?: Error;
}): AuditEvent => {
  const doc = savedObject ? `ingest credential [id=${savedObject.id}]` : 'an ingest credential';
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: type ? [type] : undefined,
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      saved_object: savedObject,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
};
