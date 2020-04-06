/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Connector,
  CasesConfigurationMapping,
} from '../../../../../containers/case/configure/types';
import { State } from '../reducer';
import { ReturnConnectors } from '../../../../../containers/case/configure/use_connectors';
import { ReturnUseCaseConfigure } from '../../../../../containers/case/configure/use_configure';
import { createUseKibanaMock } from '../../../../../mock/kibana_react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { actionTypeRegistryMock } from '../../../../../../../../../plugins/triggers_actions_ui/public/application/action_type_registry.mock';

export const connectors: Connector[] = [
  {
    id: '123',
    actionTypeId: '.servicenow',
    name: 'My Connector',
    config: {
      apiUrl: 'https://instance1.service-now.com',
      casesConfiguration: {
        mapping: [
          {
            source: 'title',
            target: 'short_description',
            actionType: 'overwrite',
          },
          {
            source: 'description',
            target: 'description',
            actionType: 'append',
          },
          {
            source: 'comments',
            target: 'comments',
            actionType: 'append',
          },
        ],
      },
    },
  },
  {
    id: '456',
    actionTypeId: '.servicenow',
    name: 'My Connector 2',
    config: {
      apiUrl: 'https://instance2.service-now.com',
      casesConfiguration: {
        mapping: [
          {
            source: 'title',
            target: 'short_description',
            actionType: 'overwrite',
          },
          {
            source: 'description',
            target: 'description',
            actionType: 'overwrite',
          },
          {
            source: 'comments',
            target: 'comments',
            actionType: 'append',
          },
        ],
      },
    },
  },
];

export const mapping: CasesConfigurationMapping[] = [
  {
    source: 'title',
    target: 'short_description',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'append',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];

export const searchURL =
  '?timerange=(global:(linkTo:!(),timerange:(from:1585487656371,fromStr:now-24h,kind:relative,to:1585574056371,toStr:now)),timeline:(linkTo:!(),timerange:(from:1585227005527,kind:absolute,to:1585313405527)))';

export const initialState: State = {
  connectorId: 'none',
  closureType: 'close-by-user',
  mapping: null,
  currentConfiguration: { connectorId: 'none', closureType: 'close-by-user' },
};

export const useCaseConfigureResponse: ReturnUseCaseConfigure = {
  loading: false,
  persistLoading: false,
  refetchCaseConfigure: jest.fn(),
  persistCaseConfigure: jest.fn(),
};

export const useConnectorsResponse: ReturnConnectors = {
  loading: false,
  connectors,
  refetchConnectors: jest.fn(),
};

export const kibanaMockImplementationArgs = {
  services: {
    ...createUseKibanaMock()().services,
    triggers_actions_ui: { actionTypeRegistry: actionTypeRegistryMock.create() },
  },
};
