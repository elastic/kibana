/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Tag, TagList } from '../../../../../../plugins/tags/public';

export const TagListExample: React.FC = () => {
  return (
    <div>
      <Tag id={'8e07bc40-bc3d-11ea-ad31-378b8af727f3'} />
      <div>
        <TagList kid={'kid::data:ip:index_pattern/123'} />
      </div>
    </div>
  );
};
