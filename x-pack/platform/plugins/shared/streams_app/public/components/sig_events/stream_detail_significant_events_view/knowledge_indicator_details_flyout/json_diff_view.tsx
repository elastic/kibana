/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'react-diff-view/style/index.css';
import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { Global, css } from '@emotion/react';
import React, { useMemo } from 'react';
import { Diff, Hunk, parseDiff } from 'react-diff-view';
import type { RenderGutter } from 'react-diff-view';
import { diffLines, formatLines } from 'unidiff';

interface Props {
  oldSource: string;
  newSource: string;
}

const TABLE_CLASS = 'streams-json-diff-table';
const CODE_CLASS = 'streams-json-diff-code';
const GUTTER_CLASS = 'streams-json-diff-gutter';
const DARK_CLASS = 'streams-json-diff-dark';

const COLORS = {
  light: {
    gutterDeletion: 'rgb(255, 215, 213)',
    lineDeletion: 'rgb(255, 235, 233)',
    gutterInsertion: 'rgb(204, 255, 216)',
    lineInsertion: 'rgb(230, 255, 236)',
  },
  dark: {
    gutterDeletion: 'rgba(248, 81, 73, 0.3)',
    lineDeletion: 'rgba(248, 81, 73, 0.1)',
    gutterInsertion: 'rgba(63, 185, 80, 0.3)',
    lineInsertion: 'rgba(46, 160, 67, 0.15)',
  },
};

const renderGutter: RenderGutter = ({ change }) => {
  if (change.type === 'insert') return <span>{'+'}</span>;
  if (change.type === 'delete') return <span>{'-'}</span>;
  return null;
};

export const JsonDiffView = ({ oldSource, newSource }: Props) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDark = colorMode === COLOR_MODES_STANDARD.dark;
  const colors = isDark ? COLORS.dark : COLORS.light;

  const diffFile = useMemo(() => {
    // Large context value so the full document is always visible, not just the changed hunks.
    const unified = formatLines(diffLines(oldSource, newSource), { context: 99999 });
    const [file] = parseDiff(unified, { nearbySequences: 'zip' });
    return file;
  }, [oldSource, newSource]);

  if (!diffFile) return null;

  const tableClassName = `${TABLE_CLASS}${isDark ? ` ${DARK_CLASS}` : ''}`;

  return (
    <>
      <Global
        styles={css`
          .${GUTTER_CLASS}:nth-child(3) {
            border-left: 1px solid ${euiTheme.colors.mediumShade};
          }
          .${GUTTER_CLASS}.diff-gutter-delete {
            background: ${colors.gutterDeletion};
            font-weight: bold;
            text-align: center;
          }
          .${GUTTER_CLASS}.diff-gutter-insert {
            background: ${colors.gutterInsertion};
            font-weight: bold;
            text-align: center;
          }
          .${CODE_CLASS}.diff-code-delete {
            background: ${colors.lineDeletion};
          }
          .${CODE_CLASS}.diff-code-insert {
            background: ${colors.lineInsertion};
          }
          .${CODE_CLASS}.diff-code {
            padding: 0 ${euiTheme.size.l} 0 ${euiTheme.size.m};
            font-family: ${euiTheme.font.familyCode};
            font-size: ${euiTheme.size.m};
          }
          .${TABLE_CLASS} .diff-gutter-col {
            width: ${euiTheme.size.xl};
          }
        `}
      />
      <div style={{ overflowX: 'auto' }}>
        <Diff
          viewType="split"
          diffType={diffFile.type}
          hunks={diffFile.hunks}
          renderGutter={renderGutter}
          className={tableClassName}
          gutterClassName={GUTTER_CLASS}
          codeClassName={CODE_CLASS}
        >
          {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
        </Diff>
      </div>
    </>
  );
};
