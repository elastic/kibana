/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import CrowdstrikeLogo from './logo.svg';
const Logo = () => {
  return <img width="32" height="32" src={CrowdstrikeLogo} alt="CrowdStrike" />;
};

// eslint-disable-next-line import/no-default-export
export { Logo as default };
