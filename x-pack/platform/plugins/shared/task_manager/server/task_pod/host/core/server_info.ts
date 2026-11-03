/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `http.getServerInfo()` of a pod: what the `server.*` settings say Kibana listens on (the pod
 * itself listens on `PORT`, and only for Task Manager). Core's value comes from the running HTTP
 * server, which a pod does not have.
 */
export const createServerInfo = (config: Record<string, unknown>) => {
  const server = ((config.server as Record<string, unknown> | undefined) ?? {}) as {
    host?: string;
    port?: number;
  };
  return () => ({
    name: 'kibana',
    protocol: 'http' as const,
    hostname: server.host ?? 'localhost',
    port: server.port ?? 5601,
  });
};
