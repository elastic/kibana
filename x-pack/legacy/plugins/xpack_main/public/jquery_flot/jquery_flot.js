/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';
if (window) {
  window.jQuery = $;
}
import 'ui/flot-charts/jquery.flot';

// load flot plugins
// avoid the `canvas` plugin, it causes blurry fonts
import 'ui/flot-charts/jquery.flot.time';
import 'ui/flot-charts/jquery.flot.crosshair';
import 'ui/flot-charts/jquery.flot.selection';

export default $;
