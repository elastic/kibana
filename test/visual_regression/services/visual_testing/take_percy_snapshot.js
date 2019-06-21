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

var readFileSync = require('fs').readFileSync;
var agentJsFilename = require('@percy/agent/dist/utils/sdk-utils').agentJsFilename;

export function takePercySnapshot() {
  if (!window.PercyAgent) {
    return false;
  }

  var agent = new window.PercyAgent({
    handleAgentCommunication: false
  });

  function queryAll(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function canvasToImage(canvas) {
    var image = document.createElement('img');
    image.src = canvas.toDataURL();
    image.style = 'max-width: 100%';
    image.setAttribute('data-percy-canvas-image', 'true');

    canvas.setAttribute('data-percy-modified-style', canvas.getAttribute('style'));
    canvas.setAttribute('style', 'display: none;');

    canvas.parentElement.appendChild(image);
  }

  queryAll('canvas').forEach(function (element) {
    canvasToImage(element);
  });

  var snapshot = agent.domSnapshot(document);

  queryAll('[data-percy-canvas-image]').forEach(function (element) {
    element.remove();
  });

  queryAll('[data-percy-modified-style]').forEach(function (element) {
    element.setAttribute('style', element.getAttribute('data-percy-modified-style'));
    element.removeAttribute('style');
  });

  return snapshot;
}

export var takePercySnapshotWithAgent = `
  ${readFileSync(agentJsFilename(), 'utf8')}

  return (${takePercySnapshot.toString()})();
`;
