/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppLocator } from '@kbn/management-plugin/common';
import { LocatorDefinition } from '@kbn/share-plugin/public';
import { ILM_LOCATOR_ID, IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import {
  getPoliciesListPath,
  getPolicyCreatePath,
  getPolicyEditPath,
} from './application/services/navigation';
import { PLUGIN } from '../common/constants';

export { ILM_LOCATOR_ID };

export interface IlmLocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class IlmLocatorDefinition implements LocatorDefinition<IlmLocatorParams> {
  constructor(protected readonly deps: IlmLocatorDefinitionDependencies) {}

  public readonly id = ILM_LOCATOR_ID;

  public readonly getLocation = async (params: IlmLocatorParams) => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: PLUGIN.ID,
    });

    switch (params.page) {
      case 'policy_create': {
        return {
          ...location,
          path: location.path + getPolicyCreatePath(),
        };
      }
      case 'policy_edit': {
        return {
          ...location,
          path: location.path + getPolicyEditPath(params.policyName!),
        };
      }
      case 'policies_list': {
        return {
          ...location,
          path: location.path + getPoliciesListPath(),
        };
      }
    }
  };
}
