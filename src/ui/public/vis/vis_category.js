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

/**
 * You should always make sure that every CATEGORY on top have a corresponding
 * display name in the below object, otherwise they won't be shown properly
 * in the vis creation wizard.
 */

const CATEGORY = {
  BASIC: 'basic',
  DATA: 'data',
  GRAPHIC: 'graphic',
  MAP: 'map',
  OTHER: 'other',
  TIME: 'time',
  // Hidden is a specific category and doesn't need a display name below
  HIDDEN: 'hidden'
};

const CATEGORY_DISPLAY_NAMES = {
  [CATEGORY.BASIC]: 'Basic Charts',
  [CATEGORY.DATA]: 'Data',
  [CATEGORY.GRAPHIC]: 'Graphic',
  [CATEGORY.MAP]: 'Maps',
  [CATEGORY.OTHER]: 'Other',
  [CATEGORY.TIME]: 'Time Series'
};

export { CATEGORY, CATEGORY_DISPLAY_NAMES };
