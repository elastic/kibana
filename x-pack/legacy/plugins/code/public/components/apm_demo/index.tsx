/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { RepoSelector } from './repo_selector';

const Container = styled.div`
  padding: 1rem;
`;

const items = Array.from(Array(20).keys()).map(i => <RepoSelector id={i} />);

export const ApmDemo = () => <Container>{items}</Container>;
