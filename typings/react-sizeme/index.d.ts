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

declare module 'react-sizeme' {
  import { Component, ComponentType } from 'react';
  type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

  export interface SizeMeProps {
    size: {
      width: number | null;
      height: number | null;
    };
  }

  export interface SizeMeOptions {
    monitorWidth?: boolean;
    monitorHeight?: boolean;
    monitorPosition?: boolean;
    refreshRate?: number;
    refreshMode?: 'throttle' | 'debounce';
    noPlaceholder?: boolean;
    children(props: SizeMeProps): JSX.Element;
  }

  export class SizeMe extends Component<SizeMeOptions> {}

  // function sizeMeReturn(Component) : Component
  // export function sizeMe(options?: SizeMeOptions): (component: ComponentType<P>) : ComponentType<Omit<P, 'size'>>

  export const withSize: (
    options?: SizeMeOptions
  ) => <P extends SizeMeProps>(component: ComponentType<P>) => ComponentType<Omit<P, 'size'>>;
}
