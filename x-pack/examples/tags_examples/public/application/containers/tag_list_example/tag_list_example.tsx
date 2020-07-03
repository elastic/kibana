/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle } from '@elastic/eui';
import { Tag, TagList, TagPicker, TagListEditable } from '../../../../../../plugins/tags/public';

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
        <TagList kid={'kid:::so:saved_object/dashboard/722b74f0-b882-11e8-a6d9-e546fe2bba5f'} />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagPicker</h2>
        </EuiTitle>
        <TagPicker selected={selected} onChange={setSelected} />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagListEditable</h2>
        </EuiTitle>
        <TagListEditable
          kid={'kid:::so:saved_object/dashboard/722b74f0-b882-11e8-a6d9-e546fe2bba5f'}
        />

        <p>Face object</p>
        <TagListEditable kid={'kid:::test:/test/722b74f0-b882-11e8-a6d9-xxxxxxxxx'} />
      </div>
    </div>
  );
};
