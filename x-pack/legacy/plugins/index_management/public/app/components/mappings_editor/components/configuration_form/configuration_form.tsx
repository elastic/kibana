/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Types } from '../../mappings_state';
import { DynamicMappingConfig } from './dynamic_mapping_config';

type MappingsConfiguration = Types['MappingsConfiguration'];

interface Props {
  defaultValue?: MappingsConfiguration;
}

export const ConfigurationForm = React.memo(({ defaultValue }: Props) => {
  return (
    <>
      <DynamicMappingConfig defaultValue={defaultValue} />
    </>
  );
});
