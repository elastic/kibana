/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiText } from '@elastic/eui';

import { CodeBlock } from '../codeblock';
import { history } from '../../utils/url';
import { FrameHeader } from './frame_header';
import { RepoTitle } from './repo_title';
import { CodeIntegrator } from './code_integrator';
import { externalFileURI } from './helpers';
import { frames, Frame, repos, results } from './data';

const associateToService = (frame: Frame) => (repo: string) =>
  alert(`repo ${repo} associated with service ${JSON.stringify(frame)}`);

const handleImport = (repo: string) => alert(`import done: ${repo}`);

export const Integrations = () => (
  <div className="codeContainer__root codeIntegrations__container">
    {frames.map(frame => {
      const { fileName, lineNumber } = frame;
      const key = `${fileName}#L${lineNumber}`;
      const snippet = results[key];

      if (snippet) {
        const { compositeContent, filePath, language, uri } = snippet;
        const { content, lineMapping } = compositeContent;
        const fileUrl = externalFileURI(uri, filePath);

        return (
          <div key={key} className="codeIntegrations__frame">
            <RepoTitle uri={snippet.uri} />
            <CodeBlock
              content={content}
              header={
                <FrameHeader
                  fileName={fileName}
                  lineNumber={lineNumber}
                  onClick={() => history.push(fileUrl)}
                />
              }
              language={language}
              lineNumber={i => lineMapping[i]}
            />
          </div>
        );
      }

      return (
        <div key={key} className="codeIntegrations__frame">
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
            <EuiText size="s" className="codeIntegrations__code">
              <span>{fileName}</span>
              <span className="codeIntegrations__preposition">at</span>
              <span>line {lineNumber}</span>
            </EuiText>
            <CodeIntegrator
              onRepoSelect={associateToService(frame)}
              onImportSuccess={handleImport}
              repos={repos}
            />
          </EuiFlexGroup>
        </div>
      );
    })}
  </div>
);
