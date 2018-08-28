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

require('../node_modules/leaflet/dist/leaflet.css');
window.L = module.exports = require('../node_modules/leaflet/dist/leaflet');
window.L.Browser.touch = false;
window.L.Browser.pointer = false;

require('../node_modules/leaflet.heat/dist/leaflet-heat.js');

require('../node_modules/leaflet-draw/dist/leaflet.draw.css');
require('../node_modules/leaflet-draw/dist/leaflet.draw.js');

require('../node_modules/leaflet-responsive-popup/leaflet.responsive.popup.css');
require('../node_modules/leaflet-responsive-popup/leaflet.responsive.popup.js');
