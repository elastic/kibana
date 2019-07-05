/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

interface Props {
  setGetDataHandler: (handler: () => Mappings) => void;
}

export interface Mappings {
  [key: string]: any;
}

export const MappingsEditor = ({ setGetDataHandler }: Props) => {
  const getFormData = () => ({
    hello: 'world',
  });

  useEffect(() => {
    setGetDataHandler(getFormData);
  }, []);
  return <h1>Mappings editor</h1>;
};
