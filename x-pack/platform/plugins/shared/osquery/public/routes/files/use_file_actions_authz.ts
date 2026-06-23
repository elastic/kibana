/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostCapability } from './use_host_capability';

export interface FileActionsAuthz {
  /** Host has Elastic Defend; endpointId is available for act-verbs. */
  capability: boolean;
  /**
   * License gate: Enterprise is required for get-file and run-script.
   *
   * TODO: The osquery public plugin does not currently receive the licensing
   * plugin's start contract (it is not in StartPlugins). Rather than add a new
   * optional plugin dependency, we defer license enforcement to the Endpoint
   * route itself, which rejects non-Enterprise tenants with 403/400. Set this
   * field to `true` for now; the Endpoint API is the authoritative gate.
   * When @kbn/licensing-plugin/public is wired into osquery StartPlugins, read
   * `licensing.license$.getValue().hasAtLeast('enterprise')` here instead.
   */
  license: boolean;
  /**
   * RBAC gate: Endpoint write-execute privileges.
   *
   * TODO: The osquery app capabilities object (`application.capabilities.osquery`)
   * does not expose endpoint-execute privileges. RBAC is enforced server-side by
   * the Endpoint route (returns 403 on insufficient privileges). Set to `true` here
   * and let the Endpoint route surface a 403 if the user lacks permission.
   * When a read of `application.capabilities.siem` / endpoint privileges is
   * available inside the osquery useKibana() context, check
   * `capabilities.siem.writeEndpointList` or similar here.
   */
  rbac: boolean;
}

/**
 * Computes the per-host file-actions authorisation verdict from the three gating
 * axes (capability / license / rbac).
 *
 * For v1 only the capability axis is fully resolved client-side; license and RBAC
 * are delegated to the Endpoint API (see TODOs above). This hook is intentionally
 * kept pure (no network calls) so it can be mocked cheaply in unit tests.
 */
export const useFileActionsAuthz = (capability: HostCapability | undefined): FileActionsAuthz => ({
  capability: capability?.endpointCapable === true,
  // TODO: resolve from licensing plugin start contract when wired into osquery StartPlugins
  license: true,
  // TODO: resolve from application.capabilities.siem / endpoint privileges when available
  rbac: true,
});
