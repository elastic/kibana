/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiFieldSearch } from '@elastic/eui';
import styled from 'styled-components';

const WrapFieldSearch = styled(EuiFieldSearch)`
  min-width: 700px;
`;

export const CertificateSearch: React.FC = () => {
  return (
    <WrapFieldSearch
      placeholder="Search certificates"
      value={''}
      onChange={() => {}}
      isClearable={true}
      aria-label="Use aria labels when no actual label is in use"
    />
  );
};
