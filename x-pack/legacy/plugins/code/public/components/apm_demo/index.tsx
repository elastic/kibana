/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { CodeIntegration } from './code_integration';

const Container = styled.div`
  padding: 1rem;
`;
const Frame = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const frames = Array.from(Array(10).keys());
const myProject = { url: 'https://github.com/rylnd/my_project', mapping: false };

const associateToService = (project: { url: string; mapping: boolean }, frame: number) => (
  repo: string
) => console.log(`repo ${repo} chosen for project ${project.url} from frame ${frame}`);

export const ApmDemo = () => (
  <Container>
    {frames.map(frame => (
      <Frame key={`frame-${frame}`}>
        <CodeIntegration
          project={myProject}
          frame={frame}
          onRepoSelect={associateToService(myProject, frame)}
        />
      </Frame>
    ))}
  </Container>
);
