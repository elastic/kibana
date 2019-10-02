/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useState } from '../../mappings_state';
import { DocumentFieldsHeaders } from './document_fields_header';
import { PropertiesList } from './properties';

export const DocumentFields = () => {
  const {
    properties: { byId, topLevelFields },
  } = useState();

  const getProperty = (propId: string) => byId[propId];
  const properties = topLevelFields.map(getProperty);

  return (
    <>
      <DocumentFieldsHeaders />
      <PropertiesList properties={properties} />
    </>
  );
};
