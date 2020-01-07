/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCodeEditor } from '@elastic/eui';
import { set } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { DetailItem } from '../../graphql/types';
import { omitTypenameAndEmpty } from '../timeline/body/helpers';

interface Props {
  data: DetailItem[];
}

const JsonEditor = styled.div`
  width: 100%;
`;

JsonEditor.displayName = 'JsonEditor';

export const JsonView = React.memo<Props>(({ data }) => (
  <JsonEditor data-test-subj="jsonView">
    <EuiCodeEditor
      mode="javascript"
      setOptions={{ fontSize: '12px' }}
      value={JSON.stringify(
        buildJsonView(data),
        omitTypenameAndEmpty,
        2 // indent level
      )}
      width="100%"
      isReadOnly
    />
  </JsonEditor>
));

JsonView.displayName = 'JsonView';

export const buildJsonView = (data: DetailItem[]) =>
  data.reduce((accumulator, item) => set(item.field, item.originalValue, accumulator), {});
