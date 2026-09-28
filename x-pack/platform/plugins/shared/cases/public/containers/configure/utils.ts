/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesConfigurationUI } from '../types';
import { ConnectorTypes } from '../../../common';
import { OWNER_INFO } from '../../../common/constants/owners';
import type { Owner } from '../../../common/constants/types';

export const initialConfiguration: CasesConfigurationUI = {
  closureType: 'close-by-user',
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
  customFields: [],
  templates: [],
  mappings: [],
  version: '',
  id: '',
  owner: '',
  observableTypes: [],
  extractObservables: false,
};

export const getConfigurationByOwner = ({
  configurations,
  owner,
}: {
  configurations: CasesConfigurationUI[] | null;
  owner: string | undefined;
}): CasesConfigurationUI => {
  if (!configurations || !owner) {
    return initialConfiguration;
  }

  const ownerDefault = OWNER_INFO[owner as Owner]?.features.observables.autoExtractDefault ?? false;
  const fallback: CasesConfigurationUI = {
    ...initialConfiguration,
    owner,
    extractObservables: ownerDefault,
  };
  return configurations.find((element) => element.owner === owner) ?? fallback;
};
