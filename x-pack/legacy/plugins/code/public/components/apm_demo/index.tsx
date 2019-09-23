/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { CodeBlock } from '../codeblock/codeblock';
import { CodeIntegration } from './code_integration';
import { Frame, frames, repos } from './data';

const Container = styled.div`
  padding: 1rem;
`;

const AlignRight = styled.div`
  text-align: right;
`;

const associateToService = (project: { uri: string; mapping: boolean }, frame: Frame) => (
  repo: string
) => console.log(`repo ${repo} chosen for project ${project.uri} from frame ${frame}`);

export const ApmDemo = () => (
  <Container>
    {frames.map((frame, i) => {
      const { uri, filePath, compositeContent, language } = frame;
      const { content, lineMapping, ranges } = compositeContent;
      const project = { uri, mapping: i % 2 === 0 };
      const key = `${uri}-${filePath}`;

      return (
        <div key={key}>
          <AlignRight>
            <CodeIntegration
              repos={repos}
              project={project}
              frame={frame}
              onRepoSelect={associateToService(project, frame)}
            />
          </AlignRight>
          <CodeBlock
            language={language}
            startLine={0}
            code={content}
            highlightRanges={ranges}
            folding={false}
            lineNumbersFunc={l => lineMapping[l - 1]}
            onClick={() => {}}
          />
        </div>
      );
    })}
  </Container>
);
