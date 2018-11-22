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

import { i18n } from '@kbn/i18n';

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
  [CATEGORY.BASIC]: i18n.translate('common.ui.vis.visCategory.basicChartsLabel', { defaultMessage: 'Basic Charts' }),
  [CATEGORY.DATA]: i18n.translate('common.ui.vis.visCategory.dataLabel', { defaultMessage: 'Data' }),
  [CATEGORY.GRAPHIC]: i18n.translate('common.ui.vis.visCategory.graphicLabel', { defaultMessage: 'Graphic' }),
  [CATEGORY.MAP]: i18n.translate('common.ui.vis.visCategory.mapsLabel', { defaultMessage: 'Maps' }),
  [CATEGORY.OTHER]: i18n.translate('common.ui.vis.visCategory.otherLabel', { defaultMessage: 'Other' }),
  [CATEGORY.TIME]: i18n.translate('common.ui.vis.visCategory.timeSeriesLabel', { defaultMessage: 'Time Series' })
};

export { CATEGORY, CATEGORY_DISPLAY_NAMES };
