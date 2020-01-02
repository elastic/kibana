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

import { ViewMode, CONTACT_CARD_EMBEDDABLE, HELLO_WORLD_EMBEDDABLE } from '../embeddable_api';
import { DashboardContainerInput } from '../../../../../../../../src/legacy/core_plugins/dashboard_embeddable_container/public/np_ready/public';

export const dashboardInput: DashboardContainerInput = {
  panels: {
    '1': {
      gridData: {
        w: 24,
        h: 15,
        x: 0,
        y: 15,
        i: '1',
      },
      type: HELLO_WORLD_EMBEDDABLE,
      explicitInput: {
        id: '1',
      },
    },
    '2': {
      gridData: {
        w: 24,
        h: 15,
        x: 24,
        y: 15,
        i: '2',
      },
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: {
        id: '2',
        firstName: 'Sue',
      } as any,
    },
    '822cd0f0-ce7c-419d-aeaa-1171cf452745': {
      gridData: {
        w: 24,
        h: 15,
        x: 0,
        y: 0,
        i: '822cd0f0-ce7c-419d-aeaa-1171cf452745',
      },
      type: 'visualization',
      explicitInput: {
        id: '822cd0f0-ce7c-419d-aeaa-1171cf452745',
      },
      savedObjectId: '3fe22200-3dcb-11e8-8660-4d65aa086b3c',
    },
    '66f0a265-7b06-4974-accd-d05f74f7aa82': {
      gridData: {
        w: 24,
        h: 15,
        x: 24,
        y: 0,
        i: '66f0a265-7b06-4974-accd-d05f74f7aa82',
      },
      type: 'visualization',
      explicitInput: {
        id: '66f0a265-7b06-4974-accd-d05f74f7aa82',
      },
      savedObjectId: '4c0f47e0-3dcd-11e8-8660-4d65aa086b3c',
    },
    'b2861741-40b9-4dc8-b82b-080c6e29a551': {
      gridData: {
        w: 24,
        h: 15,
        x: 0,
        y: 15,
        i: 'b2861741-40b9-4dc8-b82b-080c6e29a551',
      },
      type: 'search',
      explicitInput: {
        id: 'b2861741-40b9-4dc8-b82b-080c6e29a551',
      },
      savedObjectId: 'be5accf0-3dca-11e8-8660-4d65aa086b3c',
    },
  },
  isFullScreenMode: false,
  filters: [],
  useMargins: true,
  id: '',
  hidePanelTitles: false,
  query: {
    query: '',
    language: 'kuery',
  },
  timeRange: {
    from: '2017-10-01T20:20:36.275Z',
    to: '2019-02-04T21:20:55.548Z',
  },
  refreshConfig: {
    value: 0,
    pause: true,
  },
  viewMode: ViewMode.EDIT,
  lastReloadRequestTime: 1556569306103,
  title: 'New Dashboard',
  description: '',
};
