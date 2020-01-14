/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * NOTE: Applications that want to show the alerting UIs will need to add
 * check against their features here until we have a better solution. This
 * will possibly go away with https://github.com/elastic/kibana/issues/52300.
 */

export function hasShowAlertsCapability(capabilities: any): boolean {
  if (capabilities.siem && capabilities.siem['alerting:show']) {
    return true;
  }
  return false;
}

export function hasShowActionsCapability(capabilities: any): boolean {
  if (capabilities.siem && capabilities.siem['actions:show']) {
    return true;
  }
  return false;
}

export function hasSaveAlertsCapability(capabilities: any): boolean {
  if (capabilities.siem && capabilities.siem['alerting:save']) {
    return true;
  }
  return false;
}

export function hasSaveActionsCapability(capabilities: any): boolean {
  if (capabilities.siem && capabilities.siem['actions:save']) {
    return true;
  }
  return false;
}

export function hasDeleteAlertsCapability(capabilities: any): boolean {
  if (capabilities.siem && capabilities.siem['alerting:delete']) {
    return true;
  }
  return false;
}

export function hasDeleteActionsCapability(capabilities: any): boolean {
  if (capabilities.siem && capabilities.siem['actions:delete']) {
    return true;
  }
  return false;
}
