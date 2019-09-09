/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ReactNode } from 'react';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';

// TODO: Remove once typescript definitions are in EUI
interface EuiSideNavItem {
  id: string;
  name: string;
  isSelected?: boolean;
  renderItem?: () => ReactNode;
  forceOpen?: boolean;
  items?: EuiSideNavItem[];
  onClick: () => void;
}

declare module '@elastic/eui' {
  export const EuiSideNav: React.Component<{
    items: EuiSideNavItem[];
    renderItem: () => ReactNode;
  }>;

  export interface EuiTableCriteria {
    page: { index: number; size: number };
    sort?: {
      field?: string;
      direction?: Direction;
    };
  }
  export const EuiBasicTable: React.ComponentClass<{
    onTableChange?: (criteria: EuiTableCriteria) => void;
    sorting: { sort?: EuiTableCriteria['sort'] };
    [key: string]: any;
  }>;

  // export const EuiBasicTable: React.SFC<any>;
}
