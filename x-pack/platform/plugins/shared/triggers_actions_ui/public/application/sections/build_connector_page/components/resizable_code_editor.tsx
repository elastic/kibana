/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiResizeObserver } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import type { CodeEditorProps } from '@kbn/code-editor';

type Props = Omit<CodeEditorProps, 'height' | 'width' | 'fullWidth' | 'allowFullScreen'> & {
  defaultHeight: number;
  minHeight?: number;
};

/** A code editor the user can make taller by dragging the grip in its bottom-right corner. */
const ResizableCodeEditorComponent: React.FC<Props> = ({
  defaultHeight,
  minHeight = 100,
  dataTestSubj,
  ...editorProps
}) => {
  const [height, setHeight] = useState<number>(defaultHeight);

  const onResize = useCallback(({ height: nextHeight }: { height: number }) => {
    setHeight((current) => (nextHeight > 0 && nextHeight !== current ? nextHeight : current));
  }, []);

  return (
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <div
          ref={resizeRef}
          css={css({
            resize: 'vertical',
            overflow: 'hidden',
            height: defaultHeight,
            minHeight,
            maxHeight: '70vh',
          })}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-container` : undefined}
        >
          <CodeEditor {...editorProps} dataTestSubj={dataTestSubj} height={height} fullWidth />
        </div>
      )}
    </EuiResizeObserver>
  );
};

export const ResizableCodeEditor = memo(ResizableCodeEditorComponent);
