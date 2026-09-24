/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorDefinition, LocatorPublic, KibanaLocation } from '@kbn/share-plugin/public';
import {
  ALERTING_V2_RULE_LIBRARY_APP_ID,
  ALERTING_V2_RULE_LIBRARY_LOCATOR,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';

export interface AlertingV2RuleLibraryLocatorParams extends SerializableRecord {
  templateId?: string;
}

export type AlertingV2RuleLibraryLocator = LocatorPublic<AlertingV2RuleLibraryLocatorParams>;

export interface AlertingV2RuleLibraryLocatorDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class AlertingV2RuleLibraryLocatorDefinition
  implements LocatorDefinition<AlertingV2RuleLibraryLocatorParams>
{
  public readonly id = ALERTING_V2_RULE_LIBRARY_LOCATOR;

  constructor(protected readonly deps: AlertingV2RuleLibraryLocatorDependencies) {}

  public readonly getLocation = async (
    params: AlertingV2RuleLibraryLocatorParams
  ): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: ALERTING_V2_SECTION_ID,
      appId: ALERTING_V2_RULE_LIBRARY_APP_ID,
    });

    if (!params.templateId) {
      return location;
    }

    const separator = location.path.includes('?') ? '&' : '?';
    return {
      ...location,
      path: `${location.path}${separator}templateId=${encodeURIComponent(params.templateId)}`,
    };
  };
}
