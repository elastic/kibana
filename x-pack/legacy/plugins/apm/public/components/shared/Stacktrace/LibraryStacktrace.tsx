/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/Stackframe';
import { Stackframe } from './Stackframe';
import { px, unit } from '../../../style/variables';

const FramesContainer = styled('div')`
  padding-left: ${px(unit)};
`;

interface Props {
  codeLanguage?: string;
  stackframes: IStackframe[];
  id: string;
}

export function LibraryStacktrace({ codeLanguage, id, stackframes }: Props) {
  if (stackframes.length === 0) {
    return null;
  }

  return (
    <EuiAccordion
      buttonContent={i18n.translate(
        'xpack.apm.stacktraceTab.libraryFramesToogleButtonLabel',
        {
          defaultMessage:
            '{count, plural, one {# library frame} other {# library frames}}',
          values: { count: stackframes.length }
        }
      )}
      id={id}
    >
      <FramesContainer>
        {stackframes.map((stackframe, i) => (
          <Stackframe
            key={i}
            id={i.toString(10)}
            isLibraryFrame
            codeLanguage={codeLanguage}
            stackframe={stackframe}
          />
        ))}
      </FramesContainer>
    </EuiAccordion>
  );
}
