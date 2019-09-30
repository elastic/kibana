/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DocumentFieldsHeaders } from './document_fields_header';
import { Properties, Props as PropertiesProps } from './properties';

interface Props {
  defaultValue?: PropertiesProps['defaultValue'];
}

export const DocumentFields = ({ defaultValue }: Props) => {
  return (
    <>
      <DocumentFieldsHeaders />
      <Properties defaultValue={defaultValue} />
    </>
  );
};
