/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StreamNode {
  name: string;
  processing?: { steps?: unknown[] };
  routing?: Array<{
    destination: string;
    where: unknown;
    status?: string;
  }>;
}

export interface TenantIdentity {
  targetType: string;
  targetId: string;
}

export interface Bundle {
  version: 1;
  tenant: { target_type: string; target_id: string };
  exported_at: string;
  streams: Array<{
    name: string;
    processing: { steps: unknown[] };
    routing: Array<{ destination: string; where: unknown; status: string }>;
  }>;
}

/**
 * Build a bundle envelope from a set of wired streams for a tenant.
 *
 * The runtime does its own flattening; we just serialise the tree.
 * Streams are ordered ancestors-first (shortest dotted-name first), so
 * when the runtime cascades routing → child processing within one pass,
 * parents route before children execute.
 */
export const buildBundle = (streams: StreamNode[], tenant: TenantIdentity): Bundle => {
  const ordered = [...streams].sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name));

  return {
    version: 1,
    tenant: { target_type: tenant.targetType, target_id: tenant.targetId },
    exported_at: new Date().toISOString(),
    streams: ordered.map((s) => ({
      name: s.name,
      processing: { steps: s.processing?.steps ?? [] },
      routing: (s.routing ?? []).map((r) => ({
        destination: r.destination,
        where: r.where,
        status: r.status ?? 'enabled',
      })),
    })),
  };
};

/**
 * Serialise the bundle for storage in pipelines-config. The service stores
 * the config as an opaque string; we JSON-stringify the envelope.
 */
export const serialiseBundle = (bundle: Bundle): string => JSON.stringify(bundle);
