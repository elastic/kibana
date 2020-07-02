/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle } from '@elastic/eui';
import { Tag, TagList, TagPicker } from '../../../../../../plugins/tags/public';

export const TagListExample: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div>
      <div>
        <EuiTitle size="m">
          <h2>Tag</h2>
        </EuiTitle>
        <Tag id={'8e07bc40-bc3d-11ea-ad31-378b8af727f3'} />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagList</h2>
        </EuiTitle>
        <TagList kid={'kid::data:ip:index_pattern/123'} />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagPicker</h2>
        </EuiTitle>
        <TagPicker selected={selected} onChange={setSelected} />
      </div>
    </div>
  );
};
