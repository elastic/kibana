/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiCode, EuiBadge } from '@elastic/eui';
import { TagList, TagPicker, TagListEditable } from '../../../../../../plugins/tags/public';

export const TagListExample: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div>
      <div>
        <EuiTitle size="m">
          <h2>Tag</h2>
        </EuiTitle>
        <br />
        <EuiCode>{"<Tag id={'33333333-3333-3333-3333-333333333333'} />"}</EuiCode>
        <br />
        <br />
        <EuiBadge color={'#0077ff'}>Hello world</EuiBadge>
        <br />
        <br />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagList</h2>
        </EuiTitle>
        <br />
        <EuiCode>{"<TagList kid={'123'} />"}</EuiCode>
        <br />
        <br />
        <EuiBadge color={'#00ff77'}>foo</EuiBadge>
        <EuiBadge color={'#77ff00'}>bar</EuiBadge>
        <br />
        <br />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagPicker</h2>
        </EuiTitle>
        <br />
        <EuiCode>{'<TagPicker />'}</EuiCode>
        <br />
        <br />
        <TagPicker selected={selected} onChange={setSelected} />
        <br />
        <br />
      </div>

      <div>
        <EuiTitle size="m">
          <h2>TagListEditable</h2>
        </EuiTitle>
        <br />
        <EuiCode>{"<TagListEditable kid={'123'} />"}</EuiCode>
        <br />
        <br />
        <TagListEditable kid={'kid:::test:/test/722b74f0-b882-11e8-a6d9-xxxxxxxxx'} />
        <br />
        <br />
      </div>
    </div>
  );
};
