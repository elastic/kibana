/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme } from '@elastic/eui';

import type { ProcessorInternal } from '../../../types';

import type { ProcessorInfo, OnActionHandler } from '../processors_tree';

import type { Handlers } from '../../pipeline_processors_editor_item';
import { PipelineProcessorsEditorItem } from '../../pipeline_processors_editor_item';
import { AddProcessorButton } from '../../add_processor_button';

import { PrivateTree } from './private_tree';

export interface Props {
  processor: ProcessorInternal;
  processorInfo: ProcessorInfo;
  onAction: OnActionHandler;
  level: number;
  movingProcessor?: ProcessorInfo;
}

const INDENTATION_PX = 34;

const useStyles = ({ level }: { level: number }) => {
  const { euiTheme } = useEuiTheme();
  return {
    container: css`
      margin-top: ${euiTheme.size.s};
      margin-bottom: ${euiTheme.size.s};
      margin-left: ${level * INDENTATION_PX}px;
      & > * {
        overflow: visible;
      }
    `,
  };
};

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  processorInfo,
  onAction,
  movingProcessor,
  level,
}) => {
  const stringSelector = useMemo(() => processorInfo.selector.join('.'), [processorInfo.selector]);
  const styles = useStyles({ level });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlers = useMemo((): Handlers => {
    return {
      onMove: () => {
        onAction({ type: 'selectToMove', payload: { info: processorInfo } });
      },
      onCancelMove: () => {
        onAction({ type: 'cancelMove' });
      },
    };
  }, [onAction, stringSelector, processor]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderOnFailureHandlersTree = useCallback(() => {
    if (!processor.onFailure?.length) {
      return;
    }

    return (
      <div css={styles.container}>
        <EuiText size="m" color="subdued">
          {i18n.translate('xpack.ingestPipelines.pipelineEditor.onFailureProcessorsLabel', {
            defaultMessage: 'Failure handlers',
          })}
        </EuiText>
        <PrivateTree
          level={level + 1}
          movingProcessor={movingProcessor}
          onAction={onAction}
          selector={processorInfo.selector.concat('onFailure')}
          processors={processor.onFailure}
        />
        <AddProcessorButton
          ref={buttonRef}
          data-test-subj={stringSelector}
          renderButtonAsLink
          onClick={() =>
            onAction({
              type: 'addProcessor',
              payload: { target: processorInfo.selector.concat('onFailure'), buttonRef },
            })
          }
        />
      </div>
    );
  }, [processor.onFailure, stringSelector, onAction, movingProcessor, level]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PipelineProcessorsEditorItem
      movingProcessor={movingProcessor}
      selector={processorInfo.selector}
      processor={processor}
      handlers={handlers}
      description={processor.options.description}
      renderOnFailureHandlers={renderOnFailureHandlersTree}
    />
  );
};
