/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallSource } from '../../../../common/types';

/**
 * Install sources whose archive contents arrive over a channel the Kibana operator chose:
 * `registry` is whatever `xpack.fleet.registryUrl` points at (Elastic's package registry by
 * default, but a self-hosted EPR is supported), and `bundled` ships inside the Kibana
 * distribution. The trust here is in the channel, not in a per-package signature check —
 * registry installs are not gated on `verification_status`, so a package from an
 * operator-configured registry is trusted on the strength of that configuration.
 *
 * Every other source carries content supplied by whoever made the request: `upload` is raw
 * archive bytes posted by any user holding Integrations All + Agent Policies All, and `custom`
 * is generated from caller-supplied input. Assets from those sources must never inherit
 * Kibana's internal Elasticsearch identity, because that identity is far broader than the
 * caller's own Elasticsearch privileges and is not scoped to the caller's Kibana Spaces.
 */
const TRUSTED_INSTALL_SOURCES: ReadonlySet<InstallSource> = new Set<InstallSource>([
  'registry',
  'bundled',
]);

/**
 * Whether package assets from this install source may be installed with Kibana's internal
 * Elasticsearch identity. Fails closed: an unknown or missing install source is untrusted.
 */
export const isTrustedInstallSource = (installSource?: InstallSource): boolean =>
  installSource !== undefined && TRUSTED_INSTALL_SOURCES.has(installSource);
